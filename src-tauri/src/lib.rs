use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Path, PathBuf},
    process::Command,
};
pub type Result<T> = std::result::Result<T, String>;
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Relation {
    #[serde(rename = "type")]
    pub kind: String,
    pub target: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Evidence {
    pub source: String,
    pub section: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Entity {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub summary: String,
    pub status: String,
    pub confidence: f64,
    pub owner: Option<String>,
    pub effort: Option<[f64; 2]>,
    pub outcome: Option<String>,
    pub work_type: Option<String>,
    pub validation_criterion: Option<String>,
    pub skill: Option<String>,
    pub milestone: Option<String>,
    pub evidence: Vec<Evidence>,
    pub relations: Vec<Relation>,
    pub details: BTreeMap<String, String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Manifest {
    pub schema_version: u32,
    pub project: String,
    pub synthetic: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Plan {
    pub start: u32,
    pub duration: u32,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Views {
    pub schema_version: u32,
    pub layouts: BTreeMap<String, BTreeMap<String, Position>>,
    pub planning: BTreeMap<String, Plan>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Backlink {
    pub source: String,
    #[serde(rename = "type")]
    pub kind: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Snapshot {
    pub manifest: Manifest,
    pub entities: Vec<Entity>,
    pub views: Views,
    pub backlinks: BTreeMap<String, Vec<Backlink>>,
    pub documents: BTreeMap<String, String>,
    pub revision: String,
    pub root: String,
    pub git: String,
    pub demo_applied: bool,
}
const KINDS: &[(&str, &str)] = &[
    ("Product", "PRD"),
    ("Capability", "CAP"),
    ("Requirement", "REQ"),
    ("Component", "CMP"),
    ("Repository", "REP"),
    ("Interface", "INT"),
    ("WorkPackage", "WP"),
    ("Decision", "DEC"),
    ("Risk", "RSK"),
    ("Experiment", "EXP"),
    ("Dataset", "DATA"),
    ("Validation", "VAL"),
    ("Milestone", "MS"),
    ("Team", "OWN"),
    ("Source", "SRC"),
];
const RELATIONS: &[&str] = &[
    "implements",
    "depends_on",
    "blocks",
    "validates",
    "derived_from",
    "supersedes",
    "owned_by",
    "implemented_in",
    "uses",
    "motivated_by",
];
fn read<T: serde::de::DeserializeOwned>(p: &Path) -> Result<T> {
    serde_json::from_slice(&fs::read(p).map_err(|e| format!("{}: {e}", p.display()))?)
        .map_err(|e| format!("{}: {e}", p.display()))
}
pub fn json<T: Serialize>(v: &T) -> Result<String> {
    Ok(serde_json::to_string_pretty(v).map_err(|e| e.to_string())? + "\n")
}
fn atomic(p: &Path, text: &str) -> Result<()> {
    let tmp = p.with_extension("tmp");
    fs::write(&tmp, text).map_err(|e| e.to_string())?;
    fs::rename(tmp, p).map_err(|e| e.to_string())
}
pub fn validate(manifest: &Manifest, entities: &[Entity], views: &Views) -> Result<()> {
    if manifest.schema_version != 1 || views.schema_version != 1 {
        return Err("Unsupported schema version; explicit migration required".into());
    }
    if !manifest.synthetic {
        return Err("This showcase only accepts synthetic workspaces".into());
    }
    let mut ids = BTreeMap::new();
    for e in entities {
        let prefix = KINDS
            .iter()
            .find(|(k, _)| *k == e.kind)
            .ok_or(format!("Unknown kind: {}", e.kind))?
            .1;
        let suffix =
            e.id.strip_prefix(&format!("{prefix}-"))
                .ok_or(format!("Invalid ID {}", e.id))?;
        if suffix.len() != 3
            || !suffix.bytes().all(|c| c.is_ascii_digit())
            || ids.insert(e.id.clone(), e).is_some()
        {
            return Err(format!("Duplicate or invalid ID: {}", e.id));
        }
        if e.title.trim().is_empty() || !(0.0..=1.0).contains(&e.confidence) {
            return Err(format!("Invalid title/confidence: {}", e.id));
        }
        if ![
            "proposed",
            "accepted",
            "active",
            "planned",
            "done",
            "blocked",
            "open",
            "assumption",
            "passed",
            "failed",
            "superseded",
        ]
        .contains(&e.status.as_str())
        {
            return Err(format!("Invalid status: {}", e.id));
        }
        if let Some([lo, hi]) = e.effort {
            if !lo.is_finite() || !hi.is_finite() || lo < 0.0 || hi < lo {
                return Err(format!("Invalid effort range: {}", e.id));
            }
        }
        if e.kind == "WorkPackage"
            && (e.effort.is_none()
                || e.outcome.as_ref().is_none_or(|x| x.trim().is_empty())
                || e.validation_criterion
                    .as_ref()
                    .is_none_or(|x| x.trim().is_empty())
                || e.owner.is_none()
                || e.milestone.is_none()
                || e.skill.is_none()
                || e.evidence.is_empty()
                || ![Some("known"), Some("integration"), Some("research")]
                    .contains(&e.work_type.as_deref()))
        {
            return Err(format!("Incomplete work package: {}", e.id));
        }
    }
    for e in entities {
        for (id, kind) in [(&e.owner, "Team"), (&e.milestone, "Milestone")] {
            if let Some(id) = id {
                if ids.get(id).is_none_or(|x| x.kind != kind) {
                    return Err(format!("Invalid {kind} reference on {}", e.id));
                }
            }
        }
        let mut seen = BTreeSet::new();
        for r in &e.relations {
            let target = ids
                .get(&r.target)
                .ok_or(format!("Broken reference {} → {}", e.id, r.target))?;
            if e.id == r.target
                || !RELATIONS.contains(&r.kind.as_str())
                || !seen.insert((&r.kind, &r.target))
            {
                return Err(format!("Invalid/duplicate relation on {}", e.id));
            }
            if (r.kind == "owned_by" && target.kind != "Team")
                || (r.kind == "implemented_in" && target.kind != "Repository")
                || (r.kind == "motivated_by" && target.kind != "Source")
                || (r.kind == "validates"
                    && !["Requirement", "Capability", "Component"].contains(&target.kind.as_str()))
            {
                return Err(format!("Invalid {} target on {}", r.kind, e.id));
            }
        }
        let owners: Vec<_> = e
            .relations
            .iter()
            .filter(|r| r.kind == "owned_by")
            .map(|r| r.target.as_str())
            .collect();
        if owners != e.owner.iter().map(|s| s.as_str()).collect::<Vec<_>>() {
            return Err(format!("Owner and owned_by disagree on {}", e.id));
        }
        for ev in &e.evidence {
            if ids.get(&ev.source).is_none_or(|s| {
                s.kind != "Source" || !s.details.contains_key(&ev.section) || ev.section == "file"
            }) {
                return Err(format!("Broken source section on {}", e.id));
            }
        }
    }
    fn visit<'a>(
        id: &'a str,
        ids: &BTreeMap<String, &'a Entity>,
        active: &mut BTreeSet<&'a str>,
        done: &mut BTreeSet<&'a str>,
    ) -> Result<()> {
        if done.contains(id) {
            return Ok(());
        }
        if !active.insert(id) {
            return Err(format!("Dependency cycle at {id}"));
        }
        for r in &ids[id].relations {
            if r.kind == "depends_on" {
                visit(&r.target, ids, active, done)?;
            }
        }
        active.remove(id);
        done.insert(id);
        Ok(())
    }
    let mut done = BTreeSet::new();
    for e in entities {
        visit(&e.id, &ids, &mut BTreeSet::new(), &mut done)?;
    }
    for (id, p) in &views.planning {
        if ids.get(id).is_none_or(|e| e.kind != "WorkPackage")
            || p.duration == 0
            || p.start.checked_add(p.duration).is_none_or(|end| end > 52)
        {
            return Err(format!("Invalid plan: {id}"));
        }
    }
    for layout in views.layouts.values() {
        for (id, p) in layout {
            if !ids.contains_key(id) || !p.x.is_finite() || !p.y.is_finite() {
                return Err("Invalid layout position".into());
            }
        }
    }
    Ok(())
}
pub struct Store {
    pub root: PathBuf,
}
struct Lock(PathBuf);
impl Drop for Lock {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}
impl Store {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }
    fn lock(&self) -> Result<Lock> {
        let dir = self.root.join(".packinspect");
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let p = dir.join("write.lock");
        fs::OpenOptions::new().write(true).create_new(true).open(&p).map_err(|_|"Workspace busy. If a process crashed, remove .packinspect/write.lock after closing other instances.".to_string())?;
        Ok(Lock(p))
    }
    pub fn load(&self) -> Result<Snapshot> {
        let _lock = self.lock()?;
        self.load_unlocked()
    }
    fn load_unlocked(&self) -> Result<Snapshot> {
        let journal = self.root.join(".packinspect/transaction.json");
        if journal.exists() {
            let prior: BTreeMap<String, String> = read(&journal)?;
            for (p, text) in prior {
                atomic(&self.root.join(p), &text)?;
            }
            fs::remove_file(journal).map_err(|e| e.to_string())?;
        }
        let manifest = read(&self.root.join("knowledge/manifest.json"))?;
        let mut entities = Vec::new();
        for f in fs::read_dir(self.root.join("knowledge/entities")).map_err(|e| e.to_string())? {
            let p = f.map_err(|e| e.to_string())?.path();
            if p.extension().is_some_and(|x| x == "json") {
                let e: Entity = read(&p)?;
                if p.file_stem().and_then(|s| s.to_str()) != Some(e.id.as_str()) {
                    return Err(format!("Filename does not match ID: {}", p.display()));
                }
                entities.push(e);
            }
        }
        entities.sort_by(|a, b| a.id.cmp(&b.id));
        let views = read(&self.root.join("views/workspace.json"))?;
        validate(&manifest, &entities, &views)?;
        let mut backlinks: BTreeMap<String, Vec<Backlink>> = BTreeMap::new();
        for e in &entities {
            for r in &e.relations {
                backlinks
                    .entry(r.target.clone())
                    .or_default()
                    .push(Backlink {
                        source: e.id.clone(),
                        kind: r.kind.clone(),
                    });
            }
            for ev in &e.evidence {
                backlinks
                    .entry(ev.source.clone())
                    .or_default()
                    .push(Backlink {
                        source: e.id.clone(),
                        kind: format!("evidence: {}", ev.section),
                    });
            }
        }
        let mut documents = BTreeMap::new();
        for e in &entities {
            if e.kind == "Source" {
                let file = e
                    .details
                    .get("file")
                    .ok_or(format!("Source {} has no file", e.id))?;
                if !file.ends_with(".md")
                    || file.contains('/')
                    || file.contains('\\')
                    || file.contains("..")
                {
                    return Err("Source filenames must be local Markdown basenames".into());
                }
                let text = fs::read_to_string(self.root.join("sources").join(file))
                    .map_err(|e| e.to_string())?;
                for ev in entities
                    .iter()
                    .flat_map(|item| &item.evidence)
                    .filter(|ev| ev.source == e.id)
                {
                    if !text
                        .lines()
                        .any(|line| line == format!("## {}", ev.section))
                    {
                        return Err(format!(
                            "Missing document section {} / {}",
                            e.id, ev.section
                        ));
                    }
                }
                documents.insert(e.id.clone(), text);
            }
        }
        let bytes = json(&(&manifest, &entities, &views, &documents))?;
        let mut hash = 14695981039346656037u64;
        for b in bytes.bytes() {
            hash ^= b as u64;
            hash = hash.wrapping_mul(1099511628211);
        }
        let git = self
            .git(&["status", "--short", "--", "knowledge", "views", "sources"])
            .unwrap_or_else(|_| "Git unavailable".into());
        Ok(Snapshot {
            manifest,
            entities,
            views,
            backlinks,
            documents,
            revision: format!("{hash:x}"),
            root: self.root.display().to_string(),
            git,
            demo_applied: self.root.join(".packinspect/demo.json").exists(),
        })
    }
    pub fn git(&self, args: &[&str]) -> Result<String> {
        let out = Command::new("git")
            .arg("-C")
            .arg(&self.root)
            .args(args)
            .output()
            .map_err(|e| e.to_string())?;
        if !out.status.success() {
            return Err(String::from_utf8_lossy(&out.stderr).into());
        }
        Ok(String::from_utf8_lossy(&out.stdout).into())
    }
    fn check(&self, revision: &str) -> Result<Snapshot> {
        let s = self.load_unlocked()?;
        if s.revision != revision {
            return Err("Files changed since this view was loaded. Reload before saving.".into());
        }
        Ok(s)
    }
    fn transaction(&self, files: BTreeMap<String, String>) -> Result<()> {
        let mut old = BTreeMap::new();
        for p in files.keys() {
            old.insert(
                p.clone(),
                fs::read_to_string(self.root.join(p)).map_err(|e| e.to_string())?,
            );
        }
        let journal = self.root.join(".packinspect/transaction.json");
        atomic(&journal, &json(&old)?)?;
        for (p, text) in files {
            atomic(&self.root.join(p), &text)?;
        }
        fs::remove_file(journal).map_err(|e| e.to_string())?;
        Ok(())
    }
    pub fn save_entity(&self, mut entity: Entity, revision: &str) -> Result<Snapshot> {
        let _lock = self.lock()?;
        let mut s = self.check(revision)?;
        let i = s
            .entities
            .iter()
            .position(|e| e.id == entity.id)
            .ok_or("Unknown entity")?;
        if entity.kind != s.entities[i].kind {
            return Err("Changing entity type requires an agent migration".into());
        }
        entity
            .relations
            .sort_by(|a, b| (&a.kind, &a.target).cmp(&(&b.kind, &b.target)));
        s.entities[i] = entity.clone();
        validate(&s.manifest, &s.entities, &s.views)?;
        self.transaction(BTreeMap::from([(
            format!("knowledge/entities/{}.json", entity.id),
            json(&entity)?,
        )]))?;
        self.load_unlocked()
    }
    pub fn save_views(&self, views: Views, revision: &str) -> Result<Snapshot> {
        let _lock = self.lock()?;
        let s = self.check(revision)?;
        validate(&s.manifest, &s.entities, &views)?;
        self.transaction(BTreeMap::from([(
            "views/workspace.json".into(),
            json(&views)?,
        )]))?;
        self.load_unlocked()
    }
    pub fn demo(&self, apply: bool, revision: &str) -> Result<Snapshot> {
        let _lock = self.lock()?;
        let mut s = self.check(revision)?;
        let backup = self.root.join(".packinspect/demo.json");
        if apply {
            if backup.exists() {
                return Err("Change request already applied".into());
            }
            let mut before = BTreeMap::new();
            let mut after = BTreeMap::new();
            for e in &mut s.entities {
                if demo_update(e) {
                    let p = format!("knowledge/entities/{}.json", e.id);
                    before.insert(
                        p.clone(),
                        fs::read_to_string(self.root.join(&p)).map_err(|e| e.to_string())?,
                    );
                    after.insert(p, json(e)?);
                }
            }
            validate(&s.manifest, &s.entities, &s.views)?;
            atomic(&backup, &json(&(before, after.clone()))?)?;
            if let Err(err) = self.transaction(after) {
                let _ = self.load_unlocked();
                let _ = fs::remove_file(backup);
                return Err(err);
            }
        } else {
            if !backup.exists() {
                return Err("No applied change to reset".into());
            }
            let (before, after): (BTreeMap<String, String>, BTreeMap<String, String>) =
                read(&backup)?;
            for (p, text) in &after {
                if fs::read_to_string(self.root.join(p)).map_err(|e| e.to_string())? != *text {
                    return Err(format!(
                        "{} changed after demo. Preserve or revert those edits before reset.",
                        p
                    ));
                }
            }
            self.transaction(before)?;
            fs::remove_file(backup).map_err(|e| e.to_string())?;
        }
        self.load_unlocked()
    }
}
pub const AFFECTED: &[&str] = &[
    "REQ-001", "REQ-002", "CMP-001", "EXP-001", "EXP-002", "RSK-001", "WP-001", "WP-002", "WP-006",
    "MS-002", "MS-003",
];
fn demo_update(e: &mut Entity) -> bool {
    match e.id.as_str() {
        "REQ-001" => {
            e.title = "Throughput ≥ 120 parts/min".into();
            e.summary =
                "CR-01 target accepted for planning; physical validation remains required.".into();
        }
        "REQ-002" => {
            e.title = "Four synchronized cameras".into();
            e.summary =
                "CR-01 adds corner coverage; acquisition must synchronize four streams.".into();
        }
        "CMP-001" => {
            e.details.insert("camera_count".into(), "4".into());
        }
        "EXP-001" => {
            e.details.insert("hypothesis".into(),"Four synchronized cameras fit transport capacity; compare GigE and USB3 under full load".into());
        }
        "EXP-002" => {
            e.details.insert(
                "hypothesis".into(),
                "120 parts/min remains inside the reject and thermal envelope".into(),
            );
        }
        "RSK-001" => {
            e.details.insert("likelihood".into(), "5".into());
            e.details.insert("impact".into(), "5".into());
        }
        "WP-001" => {
            e.title = "Capture four synchronized image streams".into();
            e.outcome = Some("Four streams produce synchronized, timestamped sets".into());
            e.validation_criterion =
                Some("10,000 synchronized four-camera sets with no missing sequence".into());
            e.effort = Some([4., 7.]);
            e.confidence = 0.55;
        }
        "WP-002" => {
            e.effort = Some([3., 6.]);
            e.validation_criterion = Some(
                "Four-camera sustained bandwidth and jitter measured on both transports".into(),
            );
        }
        "WP-006" => {
            e.effort = Some([5., 9.]);
            e.validation_criterion = Some(
                "Eight-hour soak at 120 parts/min with four cameras; report loss and thermal drift"
                    .into(),
            );
            e.confidence = 0.4;
        }
        "MS-002" => {
            e.details.insert("target_date".into(), "2027-02-05".into());
            e.status = "proposed".into();
        }
        "MS-003" => {
            e.details.insert("target_date".into(), "2027-04-16".into());
            e.status = "proposed".into();
        }
        _ => return false,
    }
    e.evidence.push(Evidence {
        source: "SRC-006".into(),
        section: "request".into(),
    });
    e.details.insert("change_request".into(), "CR-01".into());
    true
}
pub fn default_root() -> PathBuf {
    std::env::var_os("PACKINSPECT_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .parent()
                .unwrap()
                .to_path_buf()
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> (tempfile::TempDir, Store) {
        let dir = tempfile::tempdir().unwrap();
        let root = default_root();
        for name in ["knowledge/entities", "sources", "views"] {
            fs::create_dir_all(dir.path().join(name)).unwrap();
            for f in fs::read_dir(root.join(name)).unwrap() {
                let p = f.unwrap().path();
                if p.is_file() {
                    fs::copy(&p, dir.path().join(name).join(p.file_name().unwrap())).unwrap();
                }
            }
        }
        fs::copy(
            root.join("knowledge/manifest.json"),
            dir.path().join("knowledge/manifest.json"),
        )
        .unwrap();
        let store = Store::new(dir.path().to_path_buf());
        (dir, store)
    }
    #[test]
    fn fixture_integrity_and_backlinks() {
        let (_d, s) = fixture();
        let x = s.load().unwrap();
        assert_eq!(x.entities.len(), 76);
        assert_eq!(x.documents.len(), 6);
        assert!(x.backlinks["REQ-001"].iter().any(|b| b.kind == "validates"));
    }
    #[test]
    fn rejects_duplicate_broken_and_unknown_fields() {
        let (_d, s) = fixture();
        let mut x = s.load().unwrap();
        x.entities.push(x.entities[0].clone());
        assert!(validate(&x.manifest, &x.entities, &x.views)
            .unwrap_err()
            .contains("Duplicate"));
        x.entities.pop();
        x.entities[0].relations.push(Relation {
            kind: "uses".into(),
            target: "CMP-999".into(),
        });
        assert!(validate(&x.manifest, &x.entities, &x.views)
            .unwrap_err()
            .contains("Broken"));
        let mut v = serde_json::to_value(&x.entities[0]).unwrap();
        v["surprise"] = true.into();
        assert!(serde_json::from_value::<Entity>(v).is_err());
    }
    #[test]
    fn rejects_invalid_version_effort_and_cycle() {
        let (_d, s) = fixture();
        let mut x = s.load().unwrap();
        x.manifest.schema_version = 2;
        assert!(validate(&x.manifest, &x.entities, &x.views).is_err());
        x.manifest.schema_version = 1;
        let a = x.entities.iter().position(|e| e.id == "WP-001").unwrap();
        x.entities[a].effort = Some([8., 2.]);
        assert!(validate(&x.manifest, &x.entities, &x.views).is_err());
        x.entities[a].effort = Some([2., 4.]);
        x.entities[a].relations.push(Relation {
            kind: "depends_on".into(),
            target: "WP-003".into(),
        });
        assert!(validate(&x.manifest, &x.entities, &x.views)
            .unwrap_err()
            .contains("cycle"));
    }
    #[test]
    fn serialization_is_deterministic() {
        let (_d, s) = fixture();
        let x = s.load().unwrap();
        for entity in &x.entities {
            let one = json(entity).unwrap();
            let parsed: Entity = serde_json::from_str(&one).unwrap();
            assert_eq!(one, json(&parsed).unwrap());
            assert!(one.ends_with('\n'));
        }
    }
    #[test]
    fn stale_revision_cannot_overwrite_agent_edit() {
        let (_d, s) = fixture();
        let x = s.load().unwrap();
        let mut a = x.entities[0].clone();
        a.status = "blocked".into();
        s.save_entity(a.clone(), &x.revision).unwrap();
        a.confidence = 0.2;
        assert!(s
            .save_entity(a, &x.revision)
            .unwrap_err()
            .contains("Reload"));
    }
    #[test]
    fn invalid_write_leaves_file_unchanged() {
        let (_d, s) = fixture();
        let x = s.load().unwrap();
        let mut a = x.entities[0].clone();
        a.confidence = 2.0;
        assert!(s.save_entity(a, &x.revision).is_err());
        assert_eq!(x.revision, s.load().unwrap().revision);
    }
    #[test]
    fn planning_write_does_not_modify_semantics() {
        let (_d, s) = fixture();
        let x = s.load().unwrap();
        let mut v = x.views.clone();
        v.planning.get_mut("WP-001").unwrap().start = 3;
        let next = s.save_views(v, &x.revision).unwrap();
        assert_eq!(next.entities, x.entities);
        assert_ne!(next.revision, x.revision);
    }
    #[test]
    fn demo_changes_eleven_and_reset_preserves_unrelated_edit() {
        let (_d, s) = fixture();
        let x = s.load().unwrap();
        let next = s.demo(true, &x.revision).unwrap();
        assert_eq!(
            next.entities
                .iter()
                .filter(|e| e.details.contains_key("change_request"))
                .count(),
            11
        );
        let mut other = next
            .entities
            .iter()
            .find(|e| e.id == "REQ-004")
            .unwrap()
            .clone();
        other.confidence = 0.7;
        let edited = s.save_entity(other.clone(), &next.revision).unwrap();
        let reset = s.demo(false, &edited.revision).unwrap();
        assert_eq!(
            reset.entities.iter().find(|e| e.id == "REQ-004").unwrap(),
            &other
        );
        assert_eq!(
            reset.entities.iter().find(|e| e.id == "REQ-001").unwrap(),
            x.entities.iter().find(|e| e.id == "REQ-001").unwrap()
        );
    }
    #[test]
    fn demo_reset_refuses_to_erase_later_edits() {
        let (_d, s) = fixture();
        let x = s.load().unwrap();
        let next = s.demo(true, &x.revision).unwrap();
        let mut a = next
            .entities
            .iter()
            .find(|e| e.id == "REQ-001")
            .unwrap()
            .clone();
        a.confidence = 0.3;
        let next = s.save_entity(a, &next.revision).unwrap();
        assert!(s
            .demo(false, &next.revision)
            .unwrap_err()
            .contains("changed after demo"));
    }
    #[test]
    fn missing_document_anchor_is_rejected() {
        let (_d, s) = fixture();
        fs::write(s.root.join("sources/pm-vision.md"), "# no source anchors\n").unwrap();
        assert!(s.load().unwrap_err().contains("Missing document section"));
    }
    #[test]
    fn journal_restores_interrupted_transaction() {
        let (_d, s) = fixture();
        let x = s.load().unwrap();
        let p = "knowledge/entities/REQ-001.json";
        let before = fs::read_to_string(s.root.join(p)).unwrap();
        let journal = BTreeMap::from([(p.to_string(), before.clone())]);
        fs::write(
            s.root.join(".packinspect/transaction.json"),
            json(&journal).unwrap(),
        )
        .unwrap();
        fs::write(s.root.join(p), "incomplete write").unwrap();
        assert_eq!(x.revision, s.load().unwrap().revision);
        assert_eq!(before, fs::read_to_string(s.root.join(p)).unwrap());
    }
}
