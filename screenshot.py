import os
import sys
import asyncio
from playwright.async_api import async_playwright

async def capture_local_html(html_file_path, output_filename="perfect_screenshot.png"):
    # Convert local file path to an absolute file:// URL
    absolute_path = os.path.abspath(html_file_path)
    if not os.path.exists(absolute_path):
        print(f"Error: The file '{html_file_path}' does not exist.")
        sys.exit(1)
        
    file_url = f"file://{absolute_path}"
    
    async with async_playwright() as p:
        # Launch a headless browser
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()
        
        print(f"Loading local HTML file: {absolute_path}")
        await page.goto(file_url)
        
        # Wait for network activity to settle down
        await page.wait_for_load_state("networkidle")
        
        print("Executing smooth-scroll simulation to trigger all lazy animations...")
        # Gradually scroll down to activate scroll-linked layout engines cleanly
        total_height = await page.evaluate("document.body.scrollHeight")
        current_position = 0
        scroll_step = 200  # Smaller steps ensure all animation keyframes trigger
        
        while current_position < total_height:
            current_position += scroll_step
            await page.evaluate(f"window.scrollTo(0, {current_position})")
            await asyncio.sleep(0.05) # Brief pause for animation engine frames
            
        # Scroll back to the top to reset sticky headers/elements to baseline layouts
        await page.evaluate("window.scrollTo(0, 0)")
        await asyncio.sleep(0.5)

        print("Capturing full-page layout...")
        # Playwright built-in full_page layout capture avoids manual slice-stitching bugs
        await page.screenshot(path=output_filename, full_page=True, animations="disabled")
        
        print(f"Success! Perfect screenshot saved to: {output_filename}")
        await browser.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: Missing local HTML file path.")
        print("Usage: python capture_local_html.py <path_to_file.html>")
        sys.exit(1)
        
    target_file = sys.argv[1]
    asyncio.run(capture_local_html(target_file))
