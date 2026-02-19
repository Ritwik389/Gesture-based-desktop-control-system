import cv2
import mediapipe as mp
import numpy as np
import os
import pickle
import time
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

class HandTracker:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.7
        )
        self.mp_draw = mp.solutions.drawing_utils

    def process_frame(self, frame):
        frame = cv2.flip(frame, 1)

        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(img_rgb)
        
        landmarks_list = []
        
        if results.multi_hand_landmarks:
            for hand_lms in results.multi_hand_landmarks:

                self.mp_draw.draw_landmarks(frame, hand_lms, self.mp_hands.HAND_CONNECTIONS)
                for lm in hand_lms.landmark:
                    landmarks_list.extend([lm.x, lm.y, lm.z])

        if landmarks_list:
            landmarks_list = self.normalize_landmarks(landmarks_list)

        return frame, landmarks_list, results.multi_hand_landmarks

    @staticmethod
    def normalize_landmarks(landmarks_list):
        points = np.array(landmarks_list, dtype=np.float32).reshape(-1, 3)
        wrist = points[0]
        points = points - wrist
        scales = np.linalg.norm(points, axis=1)
        max_scale = np.max(scales)
        if max_scale > 1e-6:
            points = points / max_scale
        return points.flatten().tolist()
    


class GestureModel:
    def __init__(self):
        self.model = KNeighborsClassifier(n_neighbors=3, weights="distance")
        self.is_trained = False
        self.classes = []
        self.validation_accuracy = None
        self.training_samples = 0
        self.last_trained_at = None
        self.last_neighbor_distance = None
        self.dataset_signature = None

    def train(self, X_data, y_labels):
        if len(X_data) < 1:
            return "No data to train"

        self.training_samples = len(X_data)
        self.classes = sorted(list(set(y_labels)))

        can_validate = len(self.classes) > 1 and len(X_data) >= 12
        if can_validate:
            X_train, X_val, y_train, y_val = train_test_split(
                X_data, y_labels, test_size=0.2, random_state=42, stratify=y_labels
            )
            k = max(1, min(5, len(X_train)))
            self.model = KNeighborsClassifier(n_neighbors=k, weights="distance")
            self.model.fit(X_train, y_train)
            y_pred = self.model.predict(X_val)
            self.validation_accuracy = float(accuracy_score(y_val, y_pred))
        else:
            k = max(1, min(5, len(X_data)))
            self.model = KNeighborsClassifier(n_neighbors=k, weights="distance")
            self.model.fit(X_data, y_labels)
            self.validation_accuracy = None

        self.last_trained_at = int(time.time())
        self.is_trained = True
        if self.validation_accuracy is None:
            return "Training Complete (validation skipped: need more balanced data)"
        return f"Training Complete (validation accuracy: {self.validation_accuracy:.2%})"

    def save(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump(
                {
                    "version": 2,
                    "estimator": self.model,
                    "metadata": {
                        "classes": self.classes,
                        "validation_accuracy": self.validation_accuracy,
                        "training_samples": self.training_samples,
                        "last_trained_at": self.last_trained_at,
                        "dataset_signature": self.dataset_signature,
                    },
                },
                f,
            )

    def load(self, path):
        if not os.path.exists(path):
            return False
        with open(path, "rb") as f:
            loaded = pickle.load(f)

        if isinstance(loaded, dict) and "estimator" in loaded:
            estimator = loaded.get("estimator")
            metadata = loaded.get("metadata", {})
            if hasattr(estimator, "predict_proba"):
                self.model = estimator
                self.is_trained = True
                self.classes = metadata.get("classes", [])
                self.validation_accuracy = metadata.get("validation_accuracy")
                self.training_samples = int(metadata.get("training_samples", 0))
                self.last_trained_at = metadata.get("last_trained_at")
                self.dataset_signature = metadata.get("dataset_signature")
                return True

        # Backward compatibility:
        # 1) New format: raw sklearn estimator
        # 2) Old format: serialized GestureModel wrapper with `.model`
        if hasattr(loaded, "predict_proba"):
            self.model = loaded
            self.is_trained = True
            self.classes = list(getattr(self.model, "classes_", []))
            self.validation_accuracy = None
            self.training_samples = 0
            self.last_trained_at = None
            self.dataset_signature = None
            return True

        if hasattr(loaded, "model") and hasattr(loaded.model, "predict_proba"):
            self.model = loaded.model
            self.is_trained = bool(getattr(loaded, "is_trained", True))
            self.classes = list(getattr(loaded, "classes", [])) or list(getattr(self.model, "classes_", []))
            self.validation_accuracy = getattr(loaded, "validation_accuracy", None)
            self.training_samples = int(getattr(loaded, "training_samples", 0))
            self.last_trained_at = getattr(loaded, "last_trained_at", None)
            self.dataset_signature = getattr(loaded, "dataset_signature", None)
            return self.is_trained

        return False

    def predict(self, landmarks):
        if not self.is_trained:
            return "Uncalibrated", 0.0

        prediction = self.model.predict([landmarks])[0]

        probs = self.model.predict_proba([landmarks])[0]
        confidence = max(probs)

        # Distance from nearest neighbors is used by the API to reject unknown gestures.
        try:
            k = min(3, len(getattr(self.model, "_fit_X", []))) or 1
            distances, _ = self.model.kneighbors([landmarks], n_neighbors=k)
            self.last_neighbor_distance = float(np.mean(distances[0]))
        except Exception:
            self.last_neighbor_distance = None

        return prediction, confidence
    
    
