"""Real inference wrapper for adapted remote-sensing models (§10).

Loads a trained PyTorch checkpoint and runs actual forward passes.
Never returns hardcoded confidence — all values come from the model's
softmax/sigmoid outputs on the actual input.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import torch

from .prepare_data import BIGEARTHNET_19_CLASSES, NUM_BANDS, PATCH_SIZE
from .train import RSAdapterModel


class AdaptedModelInference:
    """Load and run predictions with a trained RS adapter checkpoint.

    If no checkpoint exists, ``is_loaded`` is False and ``predict_multilabel``
    returns an honest empty result rather than fabricated confidence.
    """

    def __init__(self, checkpoint_dir: str | Path | None = None) -> None:
        self.checkpoint_dir = Path(checkpoint_dir) if checkpoint_dir else None
        self.model: RSAdapterModel | None = None
        self.config: dict[str, Any] = {}
        self.is_loaded = False
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        if self.checkpoint_dir and self.checkpoint_dir.exists():
            self._load_checkpoint()

    def _load_checkpoint(self) -> None:
        """Load model weights from the best checkpoint."""
        config_path = self.checkpoint_dir / "adapter_config.json"
        if not config_path.exists():
            return

        with config_path.open("r", encoding="utf-8") as f:
            self.config = json.load(f)

        # Find best checkpoint
        best_path = self.checkpoint_dir / "best_model.pt"
        final_path = self.checkpoint_dir / "final_model.pt"
        ckpt_path = best_path if best_path.exists() else final_path

        if not ckpt_path.exists():
            return

        num_classes = self.config.get("num_classes", len(BIGEARTHNET_19_CLASSES))
        lora_rank = self.config.get("lora_rank", 8) or 8
        lora_alpha = self.config.get("lora_alpha", 16.0) or 16.0

        self.model = RSAdapterModel(
            num_classes=num_classes,
            lora_rank=lora_rank,
            lora_alpha=lora_alpha,
        ).to(self.device)

        checkpoint = torch.load(ckpt_path, map_location=self.device, weights_only=False)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()
        self.is_loaded = True

    def predict_multilabel(self, patch: np.ndarray, threshold: float = 0.5) -> dict[str, Any]:
        """Run multi-label classification on a (C, H, W) numpy patch.

        Args:
            patch: Input array, shape (bands, H, W), float32 [0, 1].
            threshold: Sigmoid threshold for positive label assignment.

        Returns:
            Dict with predicted labels, probabilities, and confidence.
        """
        if not self.is_loaded or self.model is None:
            return {
                "predicted_labels": [],
                "probabilities": {},
                "confidence": 0.0,
                "used_adapted_checkpoint": False,
                "error": "No trained checkpoint loaded.",
            }

        # Preprocess: resize if needed, normalize
        if patch.shape[0] != NUM_BANDS:
            # Pad or truncate bands
            padded = np.zeros((NUM_BANDS, patch.shape[1], patch.shape[2]), dtype=np.float32)
            n_copy = min(patch.shape[0], NUM_BANDS)
            padded[:n_copy] = patch[:n_copy]
            patch = padded

        # Resize to expected patch size
        if patch.shape[1] != PATCH_SIZE or patch.shape[2] != PATCH_SIZE:
            import cv2
            resized = np.zeros((NUM_BANDS, PATCH_SIZE, PATCH_SIZE), dtype=np.float32)
            for b in range(NUM_BANDS):
                resized[b] = cv2.resize(patch[b], (PATCH_SIZE, PATCH_SIZE), interpolation=cv2.INTER_LINEAR)
            patch = resized

        # Normalize
        mean = np.array([0.12, 0.14, 0.15, 0.28, 0.22, 0.18], dtype=np.float32).reshape(-1, 1, 1)
        std = np.array([0.05, 0.05, 0.06, 0.08, 0.07, 0.06], dtype=np.float32).reshape(-1, 1, 1)
        patch = (patch - mean) / (std + 1e-8)

        # Forward pass
        with torch.no_grad():
            tensor = torch.from_numpy(patch).unsqueeze(0).to(self.device)
            logits = self.model(tensor)
            probs = torch.sigmoid(logits).cpu().numpy()[0]

        # Extract predictions
        predicted_indices = np.where(probs > threshold)[0].tolist()
        predicted_labels = [BIGEARTHNET_19_CLASSES[i] for i in predicted_indices]

        # Confidence is the mean probability of predicted classes
        if predicted_indices:
            confidence = float(np.mean(probs[predicted_indices]))
        else:
            # No class predicted — report the max probability as confidence
            confidence = float(np.max(probs))

        probabilities = {
            BIGEARTHNET_19_CLASSES[i]: round(float(probs[i]), 4)
            for i in range(len(BIGEARTHNET_19_CLASSES))
            if probs[i] > 0.1  # Only report classes with >10% probability
        }

        return {
            "predicted_labels": predicted_labels,
            "predicted_indices": predicted_indices,
            "probabilities": probabilities,
            "confidence": round(confidence, 4),
            "threshold": threshold,
            "used_adapted_checkpoint": True,
            "checkpoint": str(self.checkpoint_dir),
            "model_config": {
                "base_model": self.config.get("base_model"),
                "adaptation_method": self.config.get("adaptation_method"),
                "best_val_f1": self.config.get("best_val_f1"),
            },
        }

    def predict_vqa(self, image_path: str | Path, question: str) -> dict[str, Any]:
        """Answer a VQA question using the adapted model's classification output.

        Translates multi-label predictions into a natural-language answer
        grounded in the model's actual outputs.
        """
        if not self.is_loaded:
            return {
                "answer": "No adapted model checkpoint available. Using deterministic analysis.",
                "confidence": 0.0,
                "used_adapted_checkpoint": False,
            }

        # Load and preprocess image
        try:
            image = np.load(image_path) if str(image_path).endswith(".npy") else self._load_image(image_path)
        except Exception:
            return {
                "answer": "Could not load image for adapted model inference.",
                "confidence": 0.0,
                "used_adapted_checkpoint": False,
            }

        result = self.predict_multilabel(image)

        if result["predicted_labels"]:
            labels_str = ", ".join(result["predicted_labels"])
            answer = f"Adapted model identifies: {labels_str}."
        else:
            answer = "Adapted model could not confidently classify this scene."

        return {
            "answer": answer,
            "confidence": result["confidence"],
            "predicted_labels": result["predicted_labels"],
            "probabilities": result.get("probabilities", {}),
            "used_adapted_checkpoint": True,
        }

    @staticmethod
    def _load_image(path: str | Path) -> np.ndarray:
        """Load a raster image and return as (C, H, W) float32 [0, 1]."""
        path = Path(path)
        if path.suffix.lower() in (".tif", ".tiff"):
            try:
                import rasterio
                with rasterio.open(path) as src:
                    data = src.read().astype(np.float32)
                    # Normalize assuming uint16 surface reflectance
                    if data.max() > 1.0:
                        data = data / 10000.0
                    return np.clip(data, 0.0, 1.0)
            except ImportError:
                pass

        # Fallback: try as regular image
        import cv2
        img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
        if img is None:
            raise ValueError(f"Could not read image: {path}")
        if img.ndim == 2:
            img = img[np.newaxis, ...]
        elif img.ndim == 3:
            img = img.transpose(2, 0, 1)  # HWC → CHW
        return img.astype(np.float32) / (255.0 if img.max() <= 255 else 10000.0)
