import pyautogui
import sys
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
}

def _press_zoom_in():
    if sys.platform == "darwin":
        pyautogui.hotkey("command", "=")
    else:
        pyautogui.hotkey("ctrl", "=")

def _press_zoom_out():
    if sys.platform == "darwin":
        pyautogui.hotkey("command", "-")
    else:
        pyautogui.hotkey("ctrl", "-")

def _lock_screen():
    if sys.platform == "darwin":
        pyautogui.hotkey("ctrl", "command", "q")
    elif sys.platform.startswith("win"):
        pyautogui.hotkey("win", "l")
    else:
        pyautogui.hotkey("ctrl", "alt", "l")

def _perform_action(action_key):
    pyautogui_key = ACTION_MAP.get(action_key)
    if pyautogui_key:
        pyautogui.press(pyautogui_key)
        return True

    if action_key == "ZOOM_IN":
        _press_zoom_in()
        return True

    if action_key == "ZOOM_OUT":
        _press_zoom_out()
        return True

    if action_key == "LOCK_SCREEN":
        _lock_screen()
        return True

    return False

def execute_action(gesture_name, current_mappings):
    global last_action_time
    gesture_key = gesture_name.strip().lower()
    
    if gesture_key == "none" or (time.time() - last_action_time < cooldown):
        return

    mapped_action_key = current_mappings.get(gesture_key)
    if not mapped_action_key or mapped_action_key.upper() == "NONE":
        return

    action_key = mapped_action_key.upper()
    if _perform_action(action_key):
        print(f">>> EXECUTING: {gesture_key} -> {action_key}")
        last_action_time = time.time()
