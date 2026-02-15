import cv2
import mediapipe as mp
import numpy as np

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
                #can normalize cordinates relative to wrist later
                for lm in hand_lms.landmark:
                    landmarks_list.extend([lm.x, lm.y, lm.z])
                    
        return frame, landmarks_list, results.multi_hand_landmarks
    


from sklearn.neighbors import KNeighborsClassifier
import pickle
import os

class GestureModel:
    def __init__(self):
        self.model = KNeighborsClassifier(n_neighbors=3)
        self.is_trained = False

    def train(self, X_data, y_labels):
        if len(X_data) < 1:
            return "No data to train"
            
        self.model.fit(X_data, y_labels)
        self.is_trained = True
        with open('models/gesture_model.pkl', 'wb') as f:
            pickle.dump(self.model, f)
        return "Training Complete"

    def predict(self, landmarks):
        if not self.is_trained:
            return "Uncalibrated", 0.0
        
        prediction = self.model.predict([landmarks])[0]

        probs = self.model.predict_proba([landmarks])[0]
        confidence = max(probs)
        
        return prediction, confidence
    
    