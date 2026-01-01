// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Child};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{Manager, State};

// Store the backend process handle
struct BackendProcess(Mutex<Option<Child>>);

fn check_backend_health() -> bool {
    match reqwest::blocking::get("http://localhost:8420/") {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}

fn start_backend() -> Option<Child> {
    let nexus_dir = "/Users/d/NEXUS/backend";

    // Start the backend using the venv Python
    let child = Command::new("/Users/d/NEXUS/backend/venv/bin/python")
        .args(["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8420"])
        .current_dir(nexus_dir)
        .spawn()
        .ok()?;

    Some(child)
}

fn wait_for_backend(max_attempts: u32) -> bool {
    for _ in 0..max_attempts {
        if check_backend_health() {
            return true;
        }
        thread::sleep(Duration::from_secs(1));
    }
    false
}

fn ensure_ollama_running() {
    // Check if Ollama is running
    let output = Command::new("pgrep")
        .args(["-x", "ollama"])
        .output();

    if let Ok(output) = output {
        if !output.status.success() {
            // Ollama not running, try to start it
            let _ = Command::new("open")
                .args(["-a", "Ollama"])
                .spawn();
            thread::sleep(Duration::from_secs(3));
        }
    }
}

#[tauri::command]
fn get_backend_status() -> bool {
    check_backend_health()
}

fn main() {
    tauri::Builder::default()
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            let window = app.get_window("main").unwrap();

            // Show loading state
            let _ = window.set_title("Nexus AI - Starting...");

            // Ensure Ollama is running
            ensure_ollama_running();

            // Check if backend is already running
            if !check_backend_health() {
                // Start the backend
                let state: State<BackendProcess> = app.state();
                let mut process = state.0.lock().unwrap();
                *process = start_backend();

                // Wait for backend to be ready
                if !wait_for_backend(30) {
                    eprintln!("Warning: Backend may not have started properly");
                }
            }

            // Update window title when ready
            let _ = window.set_title("Nexus AI");

            #[cfg(debug_assertions)]
            {
                window.open_devtools();
            }

            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::Destroyed = event.event() {
                // Cleanup: kill the backend process when app closes
                let state: State<BackendProcess> = event.window().state();
                if let Ok(mut process) = state.0.lock() {
                    if let Some(ref mut child) = *process {
                        let _ = child.kill();
                    }
                };
            }
        })
        .invoke_handler(tauri::generate_handler![get_backend_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
