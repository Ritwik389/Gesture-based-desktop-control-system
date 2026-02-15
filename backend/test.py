import cv2
import numpy as np
from engine import HandTracker, GestureModel
import controller 

tracker = HandTracker()
model = GestureModel()


X_data = []  
y_data = [] 

mode = "IDLE"       
target_label = ""     
record_counter = 0     

print("=== GESTURE LOGIC TEST ===")
print("1. Press 'r' to record 'Rock'")
print("2. Press 'p' to record 'Paper'")
print("3. Press 't' to TRAIN")
print("4. Press 's' to START predicting")
print("5. Press 'q' to QUIT")

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # 1. Process Frame
    frame, landmarks, _ = tracker.process_frame(frame)

    # 2. Visual UI
    # Show current status on screen so you know what's happening
    status_text = f"Mode: {mode}"
    if mode == "RECORDING":
        status_text += f" ({target_label} {record_counter}/50)"
    
    cv2.putText(frame, status_text, (10, 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    cv2.putText(frame, f"Total Samples: {len(X_data)}", (10, 60), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

    # 3. Handle Recording Logic
    if mode == "RECORDING":
        if landmarks:
            X_data.append(landmarks)
            y_data.append(target_label)
            record_counter += 1
            print(f"Recording {target_label}: {record_counter}") # Debug print
        
        # STOP condition
        if record_counter >= 50:
            mode = "IDLE"
            print(f"--- FINISHED RECORDING {target_label} ---")
            record_counter = 0 # Reset counter just in case

    # 4. Handle Prediction Logic
    elif mode == "PREDICTING":
        if landmarks:
            prediction, confidence = model.predict(landmarks)
            color = (0, 255, 0) if confidence > 0.7 else (0, 0, 255)
            cv2.putText(frame, f"Gesture: {prediction} ({confidence:.2f})", (10, 90), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
            
            if confidence > 0.8:
                controller.execute_action(prediction)

    cv2.imshow("Gesture Test Logic", frame)
    
    # 5. Keyboard Controls
    key = cv2.waitKey(1) & 0xFF
    
    if key == ord('q'):
        break
        
    elif key == ord('r'):
        print(">>> USER PRESSED 'R' -> Setting target to ROCK")
        mode = "RECORDING"
        target_label = "rock"
        record_counter = 0
        
    elif key == ord('p'):
        print(">>> USER PRESSED 'P' -> Setting target to PAPER")
        mode = "RECORDING"
        target_label = "paper"
        record_counter = 0
        
    elif key == ord('t'):
        print(f"Training on {len(X_data)} samples...")
        msg = model.train(X_data, y_data)
        print(msg)
        
    elif key == ord('s'):
        if not model.is_trained:
            print("ERROR: You must TRAIN ('t') before you can START ('s')!")
        else:
            mode = "PREDICTING"
            print(">>> STARTED PREDICTING")

cap.release()
cv2.destroyAllWindows()