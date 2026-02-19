import pyautogui
import subprocess
import sys
import time

pyautogui.FAILSAFE = True 
last_action_time = 0
cooldown = 1.5 


ACTION_MAP = {
    'VOLUME_UP': 'volumeup',
    'VOLUME_DOWN': 'volumedown',
    'MUTE': 'volumemute',
    'NEXT_SLIDE': 'right',
    'PREVIOUS_SLIDE': 'left',
    'PLAY_PAUSE': 'playpause',
}
SUPPORTED_ACTIONS = set(list(ACTION_MAP.keys()) + ["ZOOM_IN", "ZOOM_OUT", "LOCK_SCREEN"])


def _osascript(script: str):
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0, (result.stdout or "").strip()


def _mac_get_volume():
    ok, out = _osascript("output volume of (get volume settings)")
    if not ok:
        return None
    try:
        return int(float(out))
    except Exception:
        return None


def _mac_set_volume(level: int):
    level = max(0, min(100, int(level)))
    _osascript(f"set volume output volume {level}")


def _mac_step_volume(delta: int):
    current = _mac_get_volume()
    if current is None:
        return False
    _mac_set_volume(current + int(delta))
    return True

def _press_zoom_in():
    # Explicit '+' key chord: Shift + '='.
    if sys.platform == "darwin":
        pyautogui.hotkey("command", "shift", "=")
    else:
        pyautogui.hotkey("ctrl", "shift", "=")

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
    if sys.platform == "darwin":
        if action_key == "VOLUME_UP":
            if _mac_step_volume(6):
                return True
        elif action_key == "VOLUME_DOWN":
            if _mac_step_volume(-6):
                return True
        elif action_key == "MUTE":
            _osascript("set volume with output muted true")
            return True

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
