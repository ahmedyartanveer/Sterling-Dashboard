import asyncio
import json
from playwright.async_api import async_playwright


class OnlineRMESepticUpdater:
    def __init__(self):
        self.base_url = "https://www.onlinerme.com"
        self.username = "AhmedA"
        self.password = "Advertising1!"
        self.target_address = "12411 133RD AVE E"
        self.output_file = "current_septic_components.json"

        self.data = {
            "category": "Pump",
            "componentType": "Siphon",
            "manufacturer": "Franklin",
            "model": "1.5 h.p.",
            "customLabel": "xyz"
        }

    # ---------------- LOGIN ----------------
    async def login(self, page):
        await page.goto(f"{self.base_url}/login.aspx", wait_until="networkidle")
        await page.fill('input[name="txtUsername"]', self.username)
        await page.fill('input[name="txtPassword"]', self.password)
        await page.click('input[name="btnSubmit"]')
        await page.wait_for_load_state("networkidle")

    # ---------------- WORK HISTORY ----------------
    async def open_work_history(self, page):
        await page.goto(
            f"{self.base_url}/MainMenu.aspx?intMenuType=4&Locked=0&type=OM",
            wait_until="networkidle"
        )
        await page.wait_for_selector("#ctl02_DataGridOMhistory")

    async def open_target_record(self, page):
        rows = await page.locator("#ctl02_DataGridOMhistory tr").all()

        for row in rows[1:]:
            cells = await row.locator("td").all()
            if len(cells) < 11:
                continue

            address = (await cells[7].text_content() or "").strip()
            if self.target_address.lower() in address.lower():
                async with page.expect_navigation():
                    await row.locator("td:nth-child(11) input").click()
                await page.wait_for_load_state("networkidle")
                return

        raise Exception("Target address not found")

    # ---------------- SEPTIC COMPONENTS ----------------
    async def open_septic_components(self, page):
        await page.locator('#leftmenu a:has-text("Septic Components")').click()
        await page.wait_for_load_state("networkidle")
        await page.wait_for_selector("#ctl02_drpComponent")

    # ---------------- ADD COMPONENT ----------------
    async def add_component(self, page):
        await page.select_option("#ctl02_drpComponent", label=self.data["category"])

        await page.wait_for_function(
            "document.getElementById('ctl02_drpComponentType').disabled === false"
        )

        await page.select_option("#ctl02_drpComponentType", label=self.data["componentType"])
        await page.wait_for_timeout(800)

        await page.select_option("#ctl02_drpManufacturer", label=self.data["manufacturer"])
        await page.wait_for_timeout(800)

        await page.wait_for_function(f"""
            [...document.querySelectorAll('#ctl02_drpModel option')]
                .some(o => o.textContent.trim() === '{self.data["model"]}')
        """)

        await page.select_option("#ctl02_drpModel", label=self.data["model"])
        await page.fill("#ctl02_txtUserLabel", self.data["customLabel"])

        async with page.expect_navigation():
            await page.click("#ctl02_btnAddComponent")

        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)  # allow table refresh

    # ---------------- CURRENT SEPTIC COMPONENTS ----------------
    async def current_septic_components(self, page):
        print("📦 Scraping Current Septic Components table...")

        await page.wait_for_selector("#ctl02_DataGridComponents")

        rows = await page.locator("#ctl02_DataGridComponents tr").all()
        data = []

        for row in rows[1:]:  # skip header
            cells = await row.locator("td").all()
            if len(cells) < 9:
                continue

            record = {
                "component": (await cells[1].text_content()).strip(),
                "userDefinedLabel": (await cells[2].text_content()).strip() or None,
                "manufacturer": (await cells[3].text_content()).strip() or None,
                "model": (await cells[4].text_content()).strip() or None,
                "serial": (await cells[5].text_content()).strip() or None,
                "tankSize": (await cells[6].text_content()).strip() or None,
                "sortOrder": (await cells[7].text_content()).strip()
            }

            data.append(record)

        with open(self.output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        print(f"✅ Table data saved to {self.output_file}")

    # ---------------- RUN ----------------
    async def run(self):
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False, slow_mo=300)
            page = await browser.new_page()

            await self.login(page)
            await self.open_work_history(page)
            await self.open_target_record(page)
            await self.open_septic_components(page)
            await self.add_component(page)
            await self.current_septic_components(page)  # updated function call

            await asyncio.sleep(5)
            await browser.close()


# ▶ RUN
asyncio.run(OnlineRMESepticUpdater().run())