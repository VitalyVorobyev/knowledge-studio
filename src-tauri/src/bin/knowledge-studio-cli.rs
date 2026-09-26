use knowledge_studio_core::{init, migrate_v1, Store};
use std::path::PathBuf;
fn main() {
    if let Err(e) = run() {
        eprintln!("{e}");
        std::process::exit(1)
    }
}
fn run() -> Result<(), String> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    match args.iter().map(String::as_str).collect::<Vec<_>>().as_slice() {
        ["init", path, project] => { init(&PathBuf::from(path), project)?; println!("Initialized {path}/knowledge-studio"); }
        ["migrate", path] => { migrate_v1(&PathBuf::from(path))?; println!("Migrated schema v1 to knowledge-studio/ schema v2; review diff before removing legacy files."); }
        ["validate", path] => { let s = Store::new(PathBuf::from(path)); let snap = s.load()?; println!("Valid: {} entities in {} · revision {}", snap.entities.len(), snap.manifest.project, snap.revision); }
        ["demo", action @ ("apply" | "reset"), path] => { let s = Store::new(PathBuf::from(path)); let snap = s.load()?; s.demo(*action == "apply", &snap.revision)?; println!("Demo {action} complete; review Git diff."); }
        _ => return Err("Usage: knowledge-studio-cli init <git-root> <project-name> | migrate <git-root> | validate <git-root> | demo apply|reset <example-root>".into()),
    }
    Ok(())
}
