import os
import sys
import asyncio
import subprocess
from pathlib import Path
import imageio_ffmpeg
import edge_tts

# Audio Segments with exact start timestamps (seconds)
NARRATION_SEGMENTS = [
    {
        "start_sec": 2.0,
        "title": "Module 1: Introduction & Process Comparison (00:00 - 00:55)",
        "text": "Welcome to the Directorate of Environment and Climate Change Application Intelligence and Review Portal for the Government of Maharashtra. In traditional manual processes, reviewing complex Environmental Impact Assessment reports and multi-page budget proposals takes weeks of manual inspection, causing fatigue and backlogs. The DECC Review Portal transforms this workflow into an automated, highly accurate digital experience, allowing officers to verify citizen applications and scheme compliance in minutes."
    },
    {
        "start_sec": 56.0,
        "title": "Module 2: Officer Dashboard & Application Queue (00:55 - 01:50)",
        "text": "Logging in as an authorized Senior Reviewer, we enter the centralized Officer Control Room and Application Dashboard. Here, reviewers can see the live application queue with priority flags, processing statuses, and preliminary AI advisory recommendations. Our core operating philosophy is built directly into every screen: AI assists with automated data extraction and risk scoring, while the final statutory decision strictly rests with the authorized human officer."
    },
    {
        "start_sec": 112.0,
        "title": "Module 3: Application Case Details & ChromaDB Policy RAG (01:50 - 03:00)",
        "text": "Opening an application case, such as the Urban Rainwater Harvesting Network, we can explore the complete application case details. In the Evidence drawer, the system leverages a ChromaDB vector knowledge base to retrieve relevant clauses from statutory scheme guidelines, such as the Green Infrastructure Guidelines, providing exact text excerpts, confidence scores, and policy thresholds to support the officer's evaluation."
    },
    {
        "start_sec": 182.0,
        "title": "Module 4: New Application Intake & Document Upload (03:00 - 04:30)",
        "text": "Now, let us walk through submitting a new environmental clearance application. In the New Application wizard, we enter the project details for the Konkan Coastal Restoration Society, titled Mangrove Belt Restoration and Coastal Green Corridor under the Green Infrastructure Support Scheme. We configure the project budget at 32 Lakh 40 Thousand Rupees and a 16-month duration, upload the required project proposal, budget spreadsheet, and registration certificate, and submit the application package to the automated intelligence pipeline."
    },
    {
        "start_sec": 272.0,
        "title": "Module 5: 33 Automated Deterministic Checks & Cross-Verification (04:30 - 05:45)",
        "text": "Once submitted, the system initiates the automated verification engine. It parses all attached documents using smart OCR, normalizes the data, and runs 33 deterministic compliance checks. These include mandatory field completeness, scheme budget limits, organization eligibility, and cross-document consistency checks to ensure all numbers across the proposal and budget sheet match with zero contradictions."
    },
    {
        "start_sec": 348.0,
        "title": "Module 6: AI Assessment, XGBoost Scoring & LLM Reasoning (05:45 - 07:15)",
        "text": "Next, we move to the AI Assessment and Scoring stage. Our 3-model XGBoost machine learning ensemble evaluates 13 canonical features to compute an objective Risk Index of 38 out of 100, alongside a quality score and risk classification. Following the ML prediction, an LLM reasoning engine synthesizes a concise case summary, identifies any missing documentation, and suggests targeted clarification questions for the reviewer to ask the applicant."
    },
    {
        "start_sec": 438.0,
        "title": "Module 7: Reviewer Workspace, Sign-Off & Email Dispatch (07:15 - 08:30)",
        "text": "Entering the Reviewer Workspace, the government officer inspects the complete evidence summary, reviews the AI advisory findings, and records the final official decision. With a single click on 'Email Report', the system generates a gap-free, responsive HTML clearance report. Switching to the applicant's inbox, we can see the official email delivered instantly with government branding, a clear application summary, and actionable issue cards outlining required clarifications."
    },
    {
        "start_sec": 512.0,
        "title": "Module 8: Clearance Analytics & Executive Summary (08:30 - 09:11)",
        "text": "Finally, the Clearance Review Analytics dashboard provides leadership with real-time visibility into overall application throughput, risk index distributions, decision ratios, and processing times. The DECC Review Portal ensures faster turnaround, complete audit transparency, and zero statutory oversights—delivering modern, trustworthy environmental governance for the state of Maharashtra."
    }
]

async def generate_audio_files(temp_dir: Path):
    temp_dir.mkdir(parents=True, exist_ok=True)
    voice = "en-IN-PrabhatNeural"
    audio_files = []
    
    for i, seg in enumerate(NARRATION_SEGMENTS):
        out_path = temp_dir / f"segment_{i:02d}.mp3"
        print(f"Generating voice for Segment {i+1} ({seg['title']})...")
        communicate = edge_tts.Communicate(seg["text"], voice=voice, rate="+0%")
        await communicate.save(str(out_path))
        audio_files.append((out_path, seg["start_sec"]))
    
    return audio_files

def mix_audio_and_video():
    project_root = Path(__file__).resolve().parents[1]
    input_video = project_root / "DECC_REVIEW_PORTAL.mp4"
    output_video = project_root / "DECC_REVIEW_PORTAL_WITH_VOICEOVER.mp4"
    script_doc = project_root / "docs" / "VIDEO_VOICEOVER_SCRIPT.md"
    temp_dir = project_root / "temp_voiceover"

    if not input_video.exists():
        print(f"Error: {input_video} does not exist.")
        return

    # 1. Generate Voice Audio via Edge-TTS
    print("Step 1: Generating Neural Voiceovers...")
    audio_files = asyncio.run(generate_audio_files(temp_dir))

    # 2. Build FFmpeg audio delay & mix filter
    print("Step 2: Mixing Audio onto Video Timeline...")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    filter_complex_parts = []
    inputs = ["-i", str(input_video)]

    for idx, (audio_path, start_sec) in enumerate(audio_files):
        inputs.extend(["-i", str(audio_path)])
        delay_ms = int(start_sec * 1000)
        filter_complex_parts.append(f"[{idx+1}:a]adelay={delay_ms}|{delay_ms}[a{idx+1}]")

    # Combine all delayed audio streams into one master audio track
    amix_inputs = "".join(f"[a{idx+1}]" for idx in range(len(audio_files)))
    filter_complex_parts.append(f"{amix_inputs}amix=inputs={len(audio_files)}:duration=first:dropout_transition=2[aout]")

    full_filter = ";".join(filter_complex_parts)

    cmd = [
        ffmpeg_exe, "-y",
        *inputs,
        "-filter_complex", full_filter,
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        str(output_video)
    ]

    print("Running FFmpeg audio multiplexing...")
    subprocess.run(cmd, check=True)

    # 3. Write Documentation Script
    print("Step 3: Writing Companion Voiceover Script Document...")
    script_content = "# DECC Review Portal — Video Narration & Presentation Script\n\n"
    script_content += "**Target Video**: `DECC_REVIEW_PORTAL_WITH_VOICEOVER.mp4`  \n"
    script_content += "**Total Duration**: 09 minutes 11 seconds (551.8 seconds)  \n"
    script_content += "**Voice Engine**: Microsoft Neural TTS (`en-IN-PrabhatNeural` - Professional Indian English Narrator)  \n"
    script_content += "**Classification**: Official Government Portal Walkthrough & Architecture Demonstration  \n\n---\n\n"

    for seg in NARRATION_SEGMENTS:
        start_m = int(seg["start_sec"]) // 60
        start_s = int(seg["start_sec"]) % 60
        script_content += f"### {seg['title']}\n"
        script_content += f"⏱ **Timestamp**: `{start_m:02d}:{start_s:02d}`\n\n"
        script_content += f"> \"{seg['text']}\"\n\n---\n\n"

    script_doc.write_text(script_content, encoding="utf-8")

    # Cleanup temp audio files
    import shutil
    if temp_dir.exists():
        shutil.rmtree(temp_dir)

    print(f"\n[SUCCESS]")
    print(f"1. Narrated Video: {output_video} ({round(output_video.stat().st_size / (1024*1024), 2)} MB)")
    print(f"2. Script Document: {script_doc}")

if __name__ == "__main__":
    mix_audio_and_video()
