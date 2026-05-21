with open("src/components/HeroCarousel.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "const [isTransitioning, setIsTransitioning] = React.useState(false);",
    "const [isTransitioning, setIsTransitioning] = React.useState(false);\n  const isTransitioningRef = React.useRef(false);"
)

content = content.replace(
    "if (isTransitioning || totalSlides === 0) return;",
    "if (isTransitioningRef.current || totalSlides === 0) return;\n    isTransitioningRef.current = true;"
)

content = content.replace(
    "setTimeout(() => setIsTransitioning(false), transitionDuration);",
    "setTimeout(() => {\n      isTransitioningRef.current = false;\n      setIsTransitioning(false);\n    }, transitionDuration);"
)

# Fix dependencies array in useCallback
content = content.replace(
    "}, [isTransitioning, totalSlides, transitionDuration]);",
    "}, [totalSlides, transitionDuration]);"
)
content = content.replace(
    "}, [totalSlides, isTransitioning, transitionDuration]);",
    "}, [totalSlides, transitionDuration]);"
)

with open("src/components/HeroCarousel.tsx", "w") as f:
    f.write(content)
