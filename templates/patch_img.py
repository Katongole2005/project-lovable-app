with open("src/components/HeroCarousel.tsx", "r") as f:
    content = f.read()

old_img = """	                <img
	                  src={backdropSrc}
	                  alt=""
	                  className={cn("h-full w-full object-cover", deviceProfile.allowComplexAnimations && "hero-backdrop-drift")}
	                  loading="eager"
	                  fetchpriority="high"
	                />"""

new_img = """	                <img
	                  src={backdropSrc}
	                  alt=""
	                  className={cn("h-full w-full object-cover", deviceProfile.allowComplexAnimations && "hero-backdrop-drift")}
	                  loading="eager"
	                  fetchpriority="high"
	                  decoding="sync"
	                />"""

content = content.replace(old_img, new_img)

with open("src/components/HeroCarousel.tsx", "w") as f:
    f.write(content)
