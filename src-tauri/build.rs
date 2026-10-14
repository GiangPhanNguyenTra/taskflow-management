fn main() {
    // Tray/default window icons are embedded at compile time. Rebuild whenever
    // one of the configured desktop icons is regenerated.
    println!("cargo:rerun-if-changed=icons/32x32.png");
    println!("cargo:rerun-if-changed=icons/128x128.png");
    println!("cargo:rerun-if-changed=icons/128x128@2x.png");
    println!("cargo:rerun-if-changed=icons/icon.ico");
    println!("cargo:rerun-if-changed=icons/icon.icns");
    tauri_build::build()
}
