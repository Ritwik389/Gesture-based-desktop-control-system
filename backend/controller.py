import pyautogui
import time

pyautogui.FAILSAFE = True 
last_action_time = 0
cooldown = 1.5 

# Map UI Action strings to PyAutoGUI keys
ACTION_MAP = {
    'VOLUME_UP': 'volumeup',
    'VOLUME_DOWN': 'volumedown',
    'MUTE': 'volumemute',
    'NEXT_SLIDE': 'right',
    'PREVIOUS_SLIDE': 'left',
    'PLAY_PAUSE': 'playpause',
    'LOCK_SCREEN': 'none' # Handled differently by OS
}

def execute_action(gesture_name, current_mappings):
    global last_action_time
    gesture_name = gesture_name.lower()
    
    if gesture_name == "none" or (time.time() - last_action_time < cooldown):
        return

    # 1. Check if this gesture has a mapping assigned
    mapped_action_key = current_mappings.get(gesture_name)
    
    if not mapped_action_key or mapped_action_key == 'NONE':
        return

    # 2. Translate UI string (e.g., 'VOLUME_UP') to PyAutoGUI key (e.g., 'volumeup')
    pyautogui_key = ACTION_MAP.get(mapped_action_key)

    if pyautogui_key:
        print(f">>> EXECUTING: {gesture_name} -> {mapped_action_key}")
        pyautogui.press(pyautogui_key)
        last_action_time = time.time()