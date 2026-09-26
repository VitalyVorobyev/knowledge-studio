use packinspect_core::{default_root, Store};
fn main() {
    if let Err(e) = run() {
        eprintln!("{e}");
        std::process::exit(1)
    }
}
fn run() -> Result<(), String> {
    let s = Store::new(default_root());
    let args: Vec<_> = std::env::args().skip(1).collect();
    let snap = s.load()?;
    match args
        .iter()
        .map(String::as_str)
        .collect::<Vec<_>>()
        .as_slice()
    {
        ["validate"] => println!(
            "Valid: {} synthetic entities; revision {}",
            snap.entities.len(),
            snap.revision
        ),
        ["demo", "apply"] => {
            s.demo(true, &snap.revision)?;
            println!("CR-01 applied. Review git diff before committing.");
        }
        ["demo", "reset"] => {
            s.demo(false, &snap.revision)?;
            println!("CR-01 reset; unrelated edits preserved.");
        }
        _ => return Err("Usage: packinspect-cli validate | demo apply | demo reset".into()),
    }
    Ok(())
}
