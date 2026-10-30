# TYB Studio v0.16.0 — Film & Animation Lab + Creator Command Center

**Free · No ads · Local-first by default · Web/PWA + Android WebView source**

This is one combined package for testing. Existing workflow filenames are preserved as `.github/workflows/main.yml` and `.github/workflows/build-apk.yml` (do not rename them). The package uses external open-source libraries loaded on demand for advanced functions; the first use of those features needs internet access.

## Current version: 0.17.0

### v0.17.0 update

- **Timeline Pro:** multi-track video/audio timeline with layered canvas preview, clip drag/trim/split, per-clip volume/opacity/blend, real-time WebM export, and `.tybproj` project save/load with media relinking.
- **Voice & Subtitles Studio:** voice processing (linked speed/pitch, 3-band EQ, compressor, mic recording) with WAV export; speech transcription to editable cues with SRT/VTT export and burned-in-subtitle WebM export. Speed and pitch are resampling-linked; formant-preserving voice transplant is not possible in a browser and is not claimed.
- **AI Lab:** AI rotoscoping via MediaPipe ImageSegmenter (automatic subject mattes, a true step beyond color keying for people), AI Character live avatar overlay driven by FaceLandmarker (cartoon/robot/animal), a lightweight three.js 3D virtual set with preset camera moves, and on-device Local AI (background removal and image captioning via transformers.js, models downloaded once and cached).
- **Platform honesty panel:** LiDAR room scanning, production-grade camera tracking, Unreal/Blender-class engines, and true voice transplant are not available in a browser app and are explicitly labeled as unavailable rather than shipped as fake controls.
- New screens: `timelineScreen`, `audioScreen`, `aiLabScreen`. Service worker cache bumped to v17. Android APK workflow path filters now cover the three new modules.


### v0.16.0 update

- Expanded local toon/stylization presets with 2D cel shading, pencil-sketch, oil-paint posterize, low-poly mosaic and stop-motion color looks, alongside the existing anime, comic, clay-like, monochrome, watercolor and pixel looks.
- Updated service-worker cache version so returning users receive the refreshed studio shell.
- Updated Android workflow path filters so edits to `film-studio.js` trigger a rebuild.
- These are browser-native stylization approximations, not a generative animation model; all existing capability notes remain in force.

## Included tools

- **Photo Studio:** import, crop, rotate, flip, resize, live adjustments, presets, text watermark, PNG/JPG/WebP export.
- **Advanced Design Studio:** editable layered canvas with text, imported images, shapes, brush drawing, layer order, duplicate/delete, move/resize/rotate/opacity controls, templates, local rule-based layout helper, undo/redo, editable JSON project save/load, PNG/JPG export, and square/story/landscape/banner/A4 canvases. This is a lightweight design workspace, not a full Canva replacement; it does not include a full vector path editor, collaboration, licensed asset library or bundled neural image generation.
- **Video Studio:** local preview, trim range, visual filters, text overlay, mirror, speed controls and real-time WebM export with audio when supported by the browser. Also includes FFmpeg.wasm trim/transcode. It is not yet a full multi-track CapCut replacement: no full multi-clip timeline, keyframe animation, transition library, advanced multi-track audio mixing/ducking, or automatic speech-to-subtitle workflow or guaranteed MP4 encoding on mobile.
- **Background Studio:** chroma-key removal, replacement color/image and manual correction brush.
- **AI person cutout:** MediaPipe Selfie Segmentation model loaded on demand; person-focused segmentation, not a general-purpose object-removal model.
- **Advanced PDF:** open/preview existing PDFs, merge PDFs, rotate and reorder pages, delete pages, add text annotations, place a signature image, cover an area with replacement text, export edited PDF.
- **Scan/OCR:** Tesseract.js OCR with language code field; OpenCV.js automatic contour-based page-corner detection plus manual corner coordinate correction/perspective warp.
- **Image-to-PDF:** add document images, reorder/rotate/enhance pages, stamp text/date/border, export multi-page image-based PDF.
- **Video transcoder:** FFmpeg.wasm-based trim/transcode to MP4/WebM/MP3/WAV when browser cross-origin isolation and memory requirements are met.
- **Backup:** AES-GCM encrypted settings/recent-activity backup with PBKDF2-derived key; restore with the passphrase.
- **Optional cloud sync:** Firebase Email/Password sign-in and Firestore settings sync using a Firebase web config supplied by the owner at runtime. No private project configuration is hard-coded. Media files are not synced.
- **Tayab AI Friend:** built-in chat companion with studio navigation guidance, optional browser speech input/output, locally stored chat history and explicitly saved local preferences. This starter version uses rule-based responses, not a full local LLM or autonomous online-learning agent.
- **PWA/module system:** responsive layout, theme, local recent activity, service-worker shell caching, extension registry and sandboxed module loader.
- **Android:** debug APK workflow and optional release signing when repository Actions secrets are configured.

## Important limitations (read before testing)

This combines the implemented features into one test package, but some professional capabilities cannot be guaranteed across all phones/browsers:

1. **AI cutout:** model is focused on people, not arbitrary objects. It downloads a model and is not offline on first use. For objects, use the color-key tool/manual brush.
2. **OCR:** Tesseract language data is downloaded on first use. Set the language field to an installed Tesseract code such as `eng`, `ara`, `fra`, or `spa`; availability depends on CDN and memory. It is not bundled offline OCR.
3. **Perspective correction:** automatic contour detection is best-effort; it can miss pages in poor light or low contrast. Review detected corners and adjust manually.
4. **PDF text replacement:** the tool overlays a white cover and new text; this is not secure redaction and original content may remain extractable. Some complex PDF forms, annotations, encryption and signatures may not survive rewriting/reordering. Editing text inside the original PDF content stream is not supported.
5. **FFmpeg:** The single-threaded FFmpeg.wasm core is loaded through blob URLs to avoid many cross-origin worker restrictions, but browser Content Security Policy, CDN availability and mobile memory can still block it; the basic WebM recorder remains available as fallback. Large files can exceed mobile memory. Test with small clips first.
6. **Cloud sync:** you must create your own Firebase project, enable Email/Password auth and Firestore, and set secure Firestore rules. The app syncs settings/recent activity only—not photos, videos or PDFs. Never allow public read/write rules.
7. **Signed release APK:** debug APK works without secrets. For a release APK, add repository Actions secrets `TYB_KEYSTORE_BASE64`, `TYB_KEYSTORE_PASSWORD`, `TYB_KEY_ALIAS`, and `TYB_KEY_PASSWORD`. The base64 secret must contain your own Android keystore. Keep the keystore and passwords private; losing the key can prevent future updates under the same app identity.
8. **Offline mode:** app shell and basic local tools can work after cache installation, but CDN-based AI/OCR/PDF/FFmpeg advanced features need internet unless you separately bundle the libraries and model data.

## Deploy and test once

1. Extract this ZIP.
2. Upload the **contents** (not the ZIP itself) to the root of your existing repository. Preserve `.github/workflows/main.yml` and `.github/workflows/build-apk.yml` exactly.
3. In GitHub **Settings → Pages**, choose **GitHub Actions** as the source.
4. Open **Actions → Deploy TYB Studio to GitHub Pages** and run it. Wait for a green successful run before opening the site.
5. Open **Actions → Build Android APK** for a debug APK. Download the `tyb-studio-debug-apk` artifact from a successful run. A signed release artifact appears only when the four signing secrets above are set.
6. On the phone, test small sample files first: photo export, PDF merge/edit/export, OCR, page detection, background cutout, encrypted backup/restore and video trim. Test the advanced CDN-dependent tools while online.

## Firebase setup for optional cloud sync

1. Create a Firebase project and add a Web App. Paste its public web config JSON in Advanced Tools at runtime.
2. Enable Authentication → Email/Password and create a Firestore database.
3. Apply rules that restrict each user to their own document, for example:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tybStudioUsers/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Do not use open/public rules. Cloud sync does not upload original media.

## Tests

GitHub Actions run syntax and source-marker tests for photo, module registry, existing tools and advanced-tool controls. These checks do not replace a live browser/Android end-to-end test. The project has not been tested on your specific phone or deployed into your repository from this ZIP.

## Privacy

Selected media processing is client-side. Firebase sync is opt-in and requires your own configuration. OCR/AI/PDF/video libraries and models may be downloaded from their respective CDNs when invoked; the app does not upload selected media to Firebase as part of settings sync.


## Version 0.9.0 — AI Builder & Resource Agent

This update adds a Pro Lab workspace with:
- A local model-file shelf (metadata only; it does not run model weights).
- A local transcript-to-SRT subtitle formatter with adjustable uniform timing.
- Import/export of Pro Lab settings and model shelf metadata as JSON.
- An explicit capability map distinguishing existing tools from AI/pro features that still require model runtimes, native engines, or backend infrastructure.
- GitHub Pages build inclusion and JavaScript syntax validation for `pro-lab.js`.

## AI Builder & Resource Agent (v0.9.0)

- Saves feature requests and produces a practical implementation checklist on-device.
- Generates a downloadable JavaScript extension starter based on a feature request; it is a scaffold, not an implemented feature or AI-generated production code.
- Searches Hugging Face public model metadata by task and links to model pages for license, file, and runtime review. Internet is needed for discovery.
- Does not silently execute code, modify deployed application source, train model weights, or install arbitrary plugins. This is a deliberate safety boundary: an installed web/PWA or APK cannot safely rewrite its own signed app package. A reviewed code update must be built and released through the repository workflow.
- Downloading a model is not enough to run it. Each model needs a compatible runtime, adapter, memory/storage budget, and license review. The app does not automatically fetch multi-gigabyte weights or enable them in the editor.

### Important capability note
This update does **not** bundle or magically enable offline generative AI models. Local image/video generation, inpainting, speech recognition, TTS, voice isolation, object tracking, interpolation, 3D, a full DAW, secure PDF redaction, and cloud collaboration require additional compatible model weights, inference runtimes, native processing engines, and/or backend services. Model files added to the shelf are only registered in browser storage; they are not executed. Existing tools may load third-party libraries from the internet when invoked.


## Version 0.11.0 — Tayab Growth Lab

- Adds a privacy-limited online discovery panel for public Hugging Face model metadata across coding, image, segmentation, speech, audio, and video tasks.
- Adds a local growth log and feature idea planner; growth history is append-only in normal use and is not designed to replace or delete existing editor features.
- Exports only model metadata and growth tasks, not Tayab chat history, preferences, selected media, contacts, or identity fields.
- Online discovery sends a fixed model-task query and does not include user prompts or personal files. As with any online request, the provider and network may still observe ordinary connection metadata such as IP address.
- Discovered listings are not downloaded or executed automatically. Review model cards, licenses, file sizes, provenance, security, device requirements, and runtime compatibility before integration. App source changes require review, tests, and a new signed/released build; a running PWA/APK cannot safely rewrite its own installed code.
- Offline, the growth log and saved discoveries remain available; new online discovery requires internet. This is not continuous self-training or an autonomous full coding model.


## v0.12.0 — Tayab Growth Engine

- Optional once-per-day online public model metadata discovery when the app is opened; this setting is off by default and sends only the selected task category.
- Local, append-only growth notes and a roadmap generator that converts ideas into review, licensing, compatibility, implementation, and testing steps.
- Export growth plan and roadmap JSON. Exports exclude chat history, personal preferences, media, contacts, and identifying fields.
- Existing app tools remain untouched. This is a safe planning/discovery engine, not a fully autonomous coding model: it does not download or execute arbitrary code, install models, or rewrite the app by itself.
- Android APK build and browser/PWA deployment workflows include the updated growth module.


## v0.13.0 — Social Creator Studio + Tayab Video Companion

- Added social aspect presets for vertical 9:16, square 1:1, and landscape 16:9 video exports.
- Added local audio-file selection, music/original volume controls, browser Web Audio mixing when supported, creative color looks, and caption/sticker text.
- Added local camera preview with an animated Tayab avatar and spoken greeting using browser speech synthesis where supported. Camera frames remain local and are not transmitted by this feature.
- Face-related effects are limited to visual looks and mirroring; this is not a face-swap or identity-replacement system.
- Export relies on browser MediaRecorder/Web Audio support and records in real time. It is not a full multitrack timeline or guaranteed MP4 output. Use music and media you have rights to use.
- Android APK version updated to 0.13.0. APK installation/device testing is still required.


## v0.14.0 — Creator Command Center

- Added an on-device brand kit, editable social copy templates, and a content planner with local persistence and CSV export.
- Added batch image resizing and conversion to WebP, JPEG, or PNG with per-image downloads; files are processed in the browser and not uploaded.
- Increased Android versionCode to 11 and versionName to 0.14.0; updated PWA cache and build workflows.
- Source syntax/marker tests and ZIP validation are run for this release. No APK installation or physical-device test is claimed unless separately performed.


## v0.16.0 — Expanded cartoon looks

- Added local photo/video frame stylization modes (anime-color, comic ink, posterized clay-like, monochrome, watercolor tint, pixel art), PNG frame export, experimental live video-frame filtering, and a four-panel video contact sheet. These are canvas filters, not AI rotoscoping or full cartoon animation.
- Added basic single-color keying with tolerance and transparent/solid-background output for the current frame. Hair detail, spill suppression, tracking, and advanced matte cleanup are not included.
- Added calibrated 2D image measurement using a known reference span. It is not a LiDAR scanner or a general 3D room measurement system; perspective affects accuracy.
- Added a local five-beat storyboard planner with editable notes and JSON export, a reusable SVG mascot concept builder, and browser text-to-speech pitch/rate preview.
- Added a new Film & Animation Lab home entry, offline cache entry, and CI syntax/feature checks. Android versionCode is 13 and versionName is 0.16.0.
- Advanced requested concepts such as rigged 3D characters, consistent character replacement, AI matte extraction, markerless camera tracking, volumetric capture, real-time voice transplant, and full rendered animation still require dedicated models/engines and are not represented as completed.
