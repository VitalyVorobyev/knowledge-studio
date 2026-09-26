#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use knowledge_studio_core::{demo_root, Entity, Snapshot, Store, Views};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::Manager;

#[derive(Default)]
struct AppState(Mutex<Option<Store>>);
#[derive(Serialize, Deserialize, Default)]
struct Recent(Vec<String>);
fn recent_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("recent.json"))
}
fn recents(app: &tauri::AppHandle) -> Result<Vec<String>, String> {
    let path = recent_file(app)?;
    if !path.exists() {
        return Ok(vec![]);
    }
    serde_json::from_slice::<Recent>(&fs::read(path).map_err(|e| e.to_string())?)
        .map(|r| r.0)
        .map_err(|e| e.to_string())
}
fn with_store<T>(
    state: tauri::State<AppState>,
    f: impl FnOnce(&Store) -> Result<T, String>,
) -> Result<T, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    f(guard.as_ref().ok_or("Choose a project folder first")?)
}
#[tauri::command]
fn recent_projects(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    recents(&app)
}
#[tauri::command]
fn open_project(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    path: String,
) -> Result<Snapshot, String> {
    let root = PathBuf::from(path)
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if !root.join("knowledge-studio/manifest.json").is_file() {
        return Err("Select a repository containing knowledge-studio/manifest.json".into());
    }
    let store = Store::new(root.clone());
    let snap = store.load()?;
    *state.0.lock().map_err(|e| e.to_string())? = Some(store);
    let mut list = recents(&app)?;
    let display = root.display().to_string();
    list.retain(|p| p != &display);
    list.insert(0, display);
    list.truncate(8);
    fs::write(
        recent_file(&app)?,
        serde_json::to_vec_pretty(&Recent(list)).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    Ok(snap)
}
#[tauri::command]
fn example_project() -> String {
    demo_root().display().to_string()
}
#[tauri::command]
fn load_workspace(state: tauri::State<AppState>) -> Result<Snapshot, String> {
    with_store(state, |s| s.load())
}
#[tauri::command]
fn save_entity(
    state: tauri::State<AppState>,
    entity: Entity,
    revision: String,
) -> Result<Snapshot, String> {
    with_store(state, |s| s.save_entity(entity, &revision))
}
#[tauri::command]
fn create_work_package(
    state: tauri::State<AppState>,
    entity: Entity,
    revision: String,
) -> Result<Snapshot, String> {
    with_store(state, |s| s.create_work_package(entity, &revision))
}
#[tauri::command]
fn delete_work_package(
    state: tauri::State<AppState>,
    id: String,
    revision: String,
) -> Result<Snapshot, String> {
    with_store(state, |s| s.delete_work_package(&id, &revision))
}
#[tauri::command]
fn save_views(
    state: tauri::State<AppState>,
    views: Views,
    revision: String,
) -> Result<Snapshot, String> {
    with_store(state, |s| s.save_views(views, &revision))
}
#[tauri::command]
fn demo_change(
    state: tauri::State<AppState>,
    apply: bool,
    revision: String,
) -> Result<Snapshot, String> {
    with_store(state, |s| s.demo(apply, &revision))
}
#[tauri::command]
fn git_diff(state: tauri::State<AppState>) -> Result<String, String> {
    with_store(state, |s| s.knowledge_diff())
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            recent_projects,
            open_project,
            example_project,
            load_workspace,
            save_entity,
            create_work_package,
            delete_work_package,
            save_views,
            demo_change,
            git_diff
        ])
        .run(tauri::generate_context!())
        .expect("Unable to start desktop app");
}
