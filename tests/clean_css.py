import re

def remove_blocks(css, classes_to_remove):
    # Regex to match a CSS rule block starting with any of the specified classes
    for cls in classes_to_remove:
        # Match class exactly, e.g., .hero-section { ... } or .hero-section, .other { ... }
        # This simple regex assumes standard formatting: selector { ... }
        pattern = r"(/\*[^*]*\*/\s*)?(?:[^{]*?\b" + cls.replace('.', '\\.') + r"\b[^{]*?)\s*\{[^}]*?\}"
        css = re.sub(pattern, "", css, flags=re.MULTILINE | re.DOTALL)
    return css

with open("styles.css", "r") as f:
    css = f.read()

unused_classes = [
    ".section-header", ".section-title", ".title-divider",
    ".hero-section", ".hero-content", ".hero-divider", ".hero-subtitle", ".hero-tagline",
    ".hero-content-fullscreen", ".logo-img-large", ".hero-tagline-minimal",
    ".manifesto-section", ".manifesto-inner", ".section-label", ".manifesto-heading", 
    ".manifesto-divider", ".manifesto-body", ".manifesto-cta",
    ".hero-bottom", ".enter-btn", ".hero-footer-row", ".hero-social",
    ".footer-logo-img", ".footer-links", ".footer-copy", ".staff-links",
    ".scroll-indicator", ".scroll-indicator-wrapper", ".scroll-line"
]

css = remove_blocks(css, unused_classes)

# Manually remove duplicates mentioned:
# 1. First @keyframes pulse (already done via multi_replace)
# 2. First .events-section (around line 926, now shifted)
css = re.sub(r"\.events-section\s*\{\s*padding:\s*6rem 2rem 8rem;[^\}]*\}", "", css)

# 3. First .reveal / .reveal.active
css = re.sub(r"\.reveal\s*\{\s*opacity:\s*0;\s*transform:\s*translateY\(30px\);\s*transition:\s*all 0\.8s ease-out;\s*\}", "", css)
css = re.sub(r"\.reveal\.active\s*\{\s*opacity:\s*1;\s*transform:\s*translateY\(0\);\s*\}", "", css)

# 4. Duplicate users-table rules
css = re.sub(r"\.users-table tbody tr\s*\{\s*border-bottom:[^\}]*\}", "", css, count=1)
css = re.sub(r"\.users-table td\s*\{\s*padding:[^\}]*\}", "", css, count=1)

with open("styles.css", "w") as f:
    f.write(css)

print("Removed unused CSS blocks!")
