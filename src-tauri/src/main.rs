#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use packinspect_core::{Entity, Snapshot, Store, Views};
use std::sync::Mutex;
type State<'a> = tauri::State<'a, Mutex<Store>>;
#[tauri::command]
fn load_workspace(state: State) -> Result<Snapshot, String> {
    state.lock().map_err(|e| e.to_string())?.load()
}
#[tauri::command]
fn save_entity(state: State, entity: Entity, revision: String) -> Result<Snapshot, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .save_entity(entity, &revision)
}
#[tauri::command]
fn save_views(state: State, views: Views, revision: String) -> Result<Snapshot, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .save_views(views, &revision)
}
#[tauri::command]
fn demo_change(state: State, apply: bool, revision: String) -> Result<Snapshot, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .demo(apply, &revision)
}
#[tauri::command]
fn git_diff(state: State) -> Result<String, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .git(&["diff", "--", "knowledge", "views", "sources"])
}
fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(Store::new(packinspect_core::default_root())))
        .invoke_handler(tauri::generate_handler![
            load_workspace,
            save_entity,
            save_views,
            demo_change,
            git_diff
        ])
        .run(tauri::generate_context!())
        .expect("Unable to start desktop app");
}
