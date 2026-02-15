import pyautogui
import time

# FAILSAFE: Drag mouse to any corner to KILL the script instantly if it goes crazy
pyautogui.FAILSAFE = True 

# Global variable to prevent "spamming" (pressing key 50 times a second)
last_action_time = 0
cooldown = 1.0  # Seconds to wait between actions

def execute_action(gesture_name):
    global last_action_time
    
    # 1. Check Cooldown (don't spam volume up!)
    if time.time() - last_action_time < cooldown:
        return

    # 2. Map Gestures to Mac Shortcuts
    if gesture_name == "fist":
        # Mute Volume (Mac specific key)
        pyautogui.press('volumemute')
        print(">>> ACTION: Mute")
        
    elif gesture_name == "palm":
        # Play/Pause Media
        pyautogui.press('playpause')
        print(">>> ACTION: Play/Pause")
        
    elif gesture_name == "thumbs_up":
        # Minimize current window (Command + M)
        pyautogui.hotkey('command', 'm')
        print(">>> ACTION: Minimize Window")

    elif gesture_name == "ok_sign":
        # Switch Browser Tab (Control + Tab)
        pyautogui.hotkey('ctrl', 'tab')
        print(">>> ACTION: Next Tab")

    # 3. Reset Cooldown
    last_action_time = time.time()