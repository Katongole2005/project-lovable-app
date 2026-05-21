with open("src/index.css", "r") as f:
    content = f.read()

old_css = """	  .hero-backdrop-drift {
	    animation: hero-backdrop-drift 18s ease-in-out infinite;
	    transform-origin: center;
	    will-change: transform;
	  }"""

new_css = """	  .hero-backdrop-drift {
	    animation: hero-backdrop-drift 18s ease-in-out infinite;
	    transform-origin: center;
	    will-change: transform;
	    backface-visibility: hidden;
	    -webkit-backface-visibility: hidden;
	    transform: translateZ(0);
	    -webkit-transform: translateZ(0);
	  }"""

content = content.replace(old_css, new_css)

with open("src/index.css", "w") as f:
    f.write(content)
