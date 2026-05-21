with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace('import { DebugConsole } from "@/components/DebugConsole";\n', '')
content = content.replace('      <DebugConsole />\n', '')

with open("src/App.tsx", "w") as f:
    f.write(content)
