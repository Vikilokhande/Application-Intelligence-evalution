import os
import sys
import asyncio
import subprocess
from pathlib import Path
import imageio_ffmpeg
import edge_tts

# 35 Exact Narration Segments from user specification
SCRIPT_SEGMENTS = [
    {
        "start_time": "00:00",
        "end_time": "00:20",
        "start_sec": 0.5,
        "text": "Welcome to the DECC Review Portal, an AI-assisted platform designed to simplify environmental application review and decision support. The portal brings document processing, validation, evidence, risk assessment, and human review together in one workflow."
    },
    {
        "start_time": "00:20",
        "end_time": "00:45",
        "start_sec": 20.5,
        "text": "The landing page introduces the platform and its main capabilities. The system is designed to reduce repetitive manual work while giving reviewers clear information to support their decisions."
    },
    {
        "start_time": "00:45",
        "end_time": "01:00",
        "start_sec": 45.5,
        "text": "The portal also supports a clear and accessible user experience, allowing reviewers to work through the application process in a structured way."
    },
    {
        "start_time": "01:00",
        "end_time": "01:15",
        "start_sec": 60.5,
        "text": "Reviewers begin by accessing the secure control room through the authentication screen."
    },
    {
        "start_time": "01:15",
        "end_time": "01:30",
        "start_sec": 75.5,
        "text": "After authentication, the reviewer enters the main review workspace and can access applications, processing, validation, AI assessment, reviewer tools, schemes, and analytics."
    },
    {
        "start_time": "01:30",
        "end_time": "01:55",
        "start_sec": 90.5,
        "text": "The dashboard provides a high-level view of the application queue. Reviewers can quickly see which applications are awaiting review, which require action, and which cases have already been approved."
    },
    {
        "start_time": "01:55",
        "end_time": "02:15",
        "start_sec": 115.5,
        "text": "The application queue makes it easy to find a case, review its status, understand the current recommendation, and open the application for detailed review."
    },
    {
        "start_time": "02:15",
        "end_time": "02:35",
        "start_sec": 135.5,
        "text": "Opening an application shows the key case information in one place. This includes the applicant, organization, scheme, project information, documents, and the current validation status."
    },
    {
        "start_time": "02:35",
        "end_time": "02:55",
        "start_sec": 155.5,
        "text": "The application details are organized into clear sections so that reviewers can focus first on the information required for a decision."
    },
    {
        "start_time": "02:55",
        "end_time": "03:10",
        "start_sec": 175.5,
        "text": "The evidence section provides supporting information retrieved from the applicable scheme and policy documents."
    },
    {
        "start_time": "03:10",
        "end_time": "03:25",
        "start_sec": 190.5,
        "text": "This helps the reviewer understand the requirements behind a validation result instead of relying only on an automated status."
    },
    {
        "start_time": "03:25",
        "end_time": "03:45",
        "start_sec": 205.5,
        "text": "The portal also provides a guided process for creating a new application. The reviewer can enter application details and provide the required supporting information."
    },
    {
        "start_time": "03:45",
        "end_time": "04:00",
        "start_sec": 225.5,
        "text": "Documents can then be uploaded and reviewed before the application is submitted for processing."
    },
    {
        "start_time": "04:00",
        "end_time": "04:15",
        "start_sec": 240.5,
        "text": "Once the application is submitted, the system begins the processing pipeline."
    },
    {
        "start_time": "04:15",
        "end_time": "04:30",
        "start_sec": 255.5,
        "text": "The application moves through document processing and information extraction before the validation stage begins."
    },
    {
        "start_time": "04:30",
        "end_time": "04:45",
        "start_sec": 270.5,
        "text": "Validation checks the submitted information against required fields, scheme requirements, and consistency rules."
    },
    {
        "start_time": "04:45",
        "end_time": "05:00",
        "start_sec": 285.5,
        "text": "The system also performs cross-document verification to identify information that matches or differs between submitted documents."
    },
    {
        "start_time": "05:00",
        "end_time": "05:15",
        "start_sec": 300.5,
        "text": "When information is unavailable for comparison, the system identifies the item for verification rather than automatically treating it as a failure."
    },
    {
        "start_time": "05:15",
        "end_time": "05:30",
        "start_sec": 315.5,
        "text": "The validation page brings these checks together and clearly separates passed checks, issues requiring attention, and items that need further verification."
    },
    {
        "start_time": "05:30",
        "end_time": "05:50",
        "start_sec": 330.5,
        "text": "Reviewers can examine individual application fields, document values, scheme requirements, and cross-document consistency from the validation workspace."
    },
    {
        "start_time": "05:50",
        "end_time": "06:10",
        "start_sec": 350.5,
        "text": "The AI Assessment then combines the validated application information with supporting evidence and risk analysis to produce an overall assessment."
    },
    {
        "start_time": "06:10",
        "end_time": "06:30",
        "start_sec": 370.5,
        "text": "The assessment includes the risk level, confidence, scoring information, and the main factors that influence the result."
    },
    {
        "start_time": "06:30",
        "end_time": "06:50",
        "start_sec": 390.5,
        "text": "The AI Assistant provides a human-readable explanation of the assessment, helping the reviewer understand why the application received its current recommendation."
    },
    {
        "start_time": "06:50",
        "end_time": "07:05",
        "start_sec": 410.5,
        "text": "Supporting evidence is also available so that the reviewer can connect the assessment with the applicable scheme and policy requirements."
    },
    {
        "start_time": "07:05",
        "end_time": "07:20",
        "start_sec": 425.5,
        "text": "The Reviewer Workspace brings the most important information together for the final human review."
    },
    {
        "start_time": "07:20",
        "end_time": "07:35",
        "start_sec": 440.5,
        "text": "Here, the reviewer can see why the case needs attention, inspect the evidence, review validation findings, and examine the AI assessment."
    },
    {
        "start_time": "07:35",
        "end_time": "07:50",
        "start_sec": 455.5,
        "text": "The reviewer can then choose the appropriate action: approve the application, request clarification, or reject the application."
    },
    {
        "start_time": "07:50",
        "end_time": "08:00",
        "start_sec": 470.5,
        "text": "The AI recommendation is advisory. The final clearance decision remains with the authorized human reviewer."
    },
    {
        "start_time": "08:00",
        "end_time": "08:12",
        "start_sec": 480.5,
        "text": "After the review, the portal can prepare a conclusion report and communicate the result to the applicant."
    },
    {
        "start_time": "08:12",
        "end_time": "08:25",
        "start_sec": 492.5,
        "text": "Email communication can be used for scenarios such as missing documents, missing information, clarification requests, approval, or rejection."
    },
    {
        "start_time": "08:25",
        "end_time": "08:40",
        "start_sec": 505.5,
        "text": "The system can therefore turn the review findings into a clear, actionable communication for the applicant."
    },
    {
        "start_time": "08:40",
        "end_time": "08:52",
        "start_sec": 520.5,
        "text": "The Schemes and Rules section manages the requirements used during application evaluation."
    },
    {
        "start_time": "08:52",
        "end_time": "09:02",
        "start_sec": 532.5,
        "text": "Reviewers can search policy knowledge, review scheme rules, and manage the criteria used by the platform."
    },
    {
        "start_time": "09:02",
        "end_time": "09:10",
        "start_sec": 542.5,
        "text": "Finally, analytics provides a high-level view of application activity, review outcomes, and validation trends."
    },
    {
        "start_time": "09:10",
        "end_time": "09:11.8",
        "start_sec": 550.0,
        "text": "DECC Review Portal — AI assists, human decides."
    }
]

async def generate_voiceover_segments(temp_dir: Path):
    temp_dir.mkdir(parents=True, exist_ok=True)
    voice = "en-IN-PrabhatNeural"
    audio_items = []

    print(f"Generating {len(SCRIPT_SEGMENTS)} synchronized audio segments using voice: {voice}...")
    for idx, seg in enumerate(SCRIPT_SEGMENTS):
        out_file = temp_dir / f"seg_{idx:03d}.mp3"
        comm = edge_tts.Communicate(seg["text"], voice=voice, rate="+0%")
        await comm.save(str(out_file))
        audio_items.append({
            "index": idx,
            "path": out_file,
            "start_sec": seg["start_sec"],
            "start_time": seg["start_time"],
            "end_time": seg["end_time"],
            "text": seg["text"]
        })
        print(f"[{seg['start_time']} - {seg['end_time']}] Segment {idx+1}/{len(SCRIPT_SEGMENTS)} generated.")

    return audio_items

def render_final_video():
    project_root = Path(__file__).resolve().parents[1]
    input_video = project_root / "DECC_REVIEW_PORTAL.mp4"
    output_video = project_root / "DECC_REVIEW_PORTAL_voiceover.mp4"
    script_txt = project_root / "DECC_REVIEW_PORTAL_voiceover_script.txt"
    temp_dir = project_root / "temp_tts_segments"

    if not input_video.exists():
        print(f"Error: {input_video} not found")
        return

    # Step 1: Generate TTS audio clips
    audio_items = asyncio.run(generate_voiceover_segments(temp_dir))

    # Step 2: Build FFmpeg delay and mix filter
    print("\nAssembling audio timeline with FFmpeg...")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    inputs = ["-i", str(input_video)]
    filter_chains = []

    for idx, item in enumerate(audio_items):
        inputs.extend(["-i", str(item["path"])])
        delay_ms = int(item["start_sec"] * 1000)
        filter_chains.append(f"[{idx+1}:a]adelay={delay_ms}|{delay_ms}[a{idx+1}]")

    # Mix all delayed inputs together
    amix_inputs = "".join(f"[a{idx+1}]" for idx in range(len(audio_items)))
    filter_chains.append(
        f"{amix_inputs}amix=inputs={len(audio_items)}:duration=first:dropout_transition=2,volume=1.8[aout]"
    )

    full_filter = ";".join(filter_chains)

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

    print("Executing final rendering...")
    subprocess.run(cmd, check=True)

    # Step 3: Write script TXT file
    print("Writing DECC_REVIEW_PORTAL_voiceover_script.txt...")
    txt_lines = [
        "==================================================",
        "DECC REVIEW PORTAL — OFFICIAL VOICEOVER SCRIPT",
        "==================================================",
        "Target Video: DECC_REVIEW_PORTAL_voiceover.mp4",
        "Duration: 09:11.84 (551.84 seconds)",
        "Voice: en-IN-PrabhatNeural (Calm Indian-English Professional Voice)",
        "Principle: 'AI assists. Human decides.'",
        "==================================================",
        ""
    ]

    for seg in SCRIPT_SEGMENTS:
        txt_lines.append(f"[{seg['start_time']} - {seg['end_time']}]")
        txt_lines.append(f"\"{seg['text']}\"")
        txt_lines.append("")

    script_txt.write_text("\n".join(txt_lines), encoding="utf-8")

    # Cleanup temp directory
    import shutil
    if temp_dir.exists():
        shutil.rmtree(temp_dir)

    print("\n==================================================")
    print("FINAL RENDERING COMPLETE")
    print(f"Video File: {output_video} ({round(output_video.stat().st_size / (1024*1024), 2)} MB)")
    print(f"Script File: {script_txt}")
    print("==================================================")

if __name__ == "__main__":
    render_final_video()
