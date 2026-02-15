import pyautogui
import time

# FAILSAFE: Drag mouse to any corner to KILL the script instantly if it goes crazy
pyautogui.FAILSAFE = True 

# Global variable to prevent "spamming" (pressing key 50 times a second)
last_action_time = 0
cooldown = 2.0  # Wait 2 seconds between actions so it doesn't stutter

def execute_action(gesture_name):
    global last_action_time
    if gesture_name=="nothing":
        return
        
    
    # Check if we are still in "cooldown"
    if time.time() - last_action_time < cooldown:
        return

    # --- THE MAPPINGS ---
    if gesture_name == "rock":
        # ACTION: Mute/Unmute Volume
        print(">>> ACTION TRIGGERED: Mute Volume")
        pyautogui.press('volumemute')
        last_action_time = time.time()
        
    elif gesture_name == "paper":
        # ACTION: Play/Pause YouTube or Spotify
        print(">>> ACTION TRIGGERED: Play/Pause")
        pyautogui.press('playpause')
        last_action_time = time.time()

    elif gesture_name == "thumbs_up":
        # ACTION: Switch Windows (Command + Tab)
        print(">>> ACTION TRIGGERED: Switch Window")
        pyautogui.hotkey('command', 'tab')
        last_action_time = time.time()