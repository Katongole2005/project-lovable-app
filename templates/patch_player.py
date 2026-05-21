with open("src/components/CinematicVideoPlayer.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "// Player Diagnostic Logger" in line:
        skip = True
    
    if skip and "  // Handle PiP availability and state" in line:
        skip = False
        
    if not skip:
        new_lines.append(line)

with open("src/components/CinematicVideoPlayer.tsx", "w") as f:
    f.writelines(new_lines)
