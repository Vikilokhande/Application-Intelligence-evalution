import os
import subprocess
from pathlib import Path
import imageio_ffmpeg

def process_video():
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    project_root = Path(__file__).resolve().parents[1]
    input_video = project_root / "Screen Recording 2026-08-25 130446.mp4"

    if not input_video.exists():
        print(f"Error: {input_video} not found")
        return

    print(f"Processing: {input_video}")
    
    # 1. Output video with the 04:25 - 06:30 portion CUT OUT (Part 1 [00:00:00 - 00:04:25] + Part 2 [00:06:30 - end])
    output_removed_middle = project_root / "Screen Recording 2026-08-25 130446_removed_4m25s_to_6m30s.mp4"
    part1 = project_root / "temp_part1.mp4"
    part2 = project_root / "temp_part2.mp4"
    concat_list = project_root / "concat_list.txt"

    print("Step 1: Extracting Part 1 (00:00:00 to 00:04:25)...")
    cmd_part1 = [
        ffmpeg_exe, "-y",
        "-ss", "00:00:00", "-to", "00:04:25",
        "-i", str(input_video),
        "-c:v", "libx264", "-crf", "18", "-preset", "fast",
        "-c:a", "aac", "-b:a", "192k",
        str(part1)
    ]
    subprocess.run(cmd_part1, check=True)

    print("Step 2: Extracting Part 2 (00:06:30 to end)...")
    cmd_part2 = [
        ffmpeg_exe, "-y",
        "-ss", "00:06:30",
        "-i", str(input_video),
        "-c:v", "libx264", "-crf", "18", "-preset", "fast",
        "-c:a", "aac", "-b:a", "192k",
        str(part2)
    ]
    subprocess.run(cmd_part2, check=True)

    print("Step 3: Concatenating Part 1 and Part 2 (skipping 04:25 - 06:30)...")
    concat_list.write_text(f"file '{part1.name}'\nfile '{part2.name}'\n", encoding="utf-8")
    
    cmd_concat = [
        ffmpeg_exe, "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(concat_list),
        "-c", "copy",
        str(output_removed_middle)
    ]
    subprocess.run(cmd_concat, check=True)

    # 2. Also output the video starting AFTER 06:30 (from 00:06:30 to end)
    output_after = project_root / "Screen Recording 2026-08-25 130446_after_6m30s.mp4"
    import shutil
    shutil.copyfile(part2, output_after)

    # Cleanup temp files
    if part1.exists(): part1.unlink()
    if part2.exists(): part2.unlink()
    if concat_list.exists(): concat_list.unlink()

    print(f"\n[DONE]")
    print(f"1. Video with 04:25-06:30 removed: {output_removed_middle} ({round(output_removed_middle.stat().st_size / (1024*1024), 2)} MB)")
    print(f"2. Video after 06:30 (06:30 to end): {output_after} ({round(output_after.stat().st_size / (1024*1024), 2)} MB)")

if __name__ == "__main__":
    process_video()
