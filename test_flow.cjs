const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log("Navigating to http://localhost:5176...");
    await page.goto('http://localhost:5176');
    await page.waitForTimeout(1000);
    
    // Check if we are on the Registration page
    const bodyText = await page.innerText('body');
    if (bodyText.includes('Register Institution')) {
      console.log("✅ Successfully reached Registration portal.");
      
      console.log("Filling registration form...");
      await page.fill('input[placeholder="e.g. Alliance High School"]', 'Single Tenant Academy');
      await page.fill('input[type="email"]', 'boss@singletenant.local');
      await page.fill('input[type="password"]', 'password123');
      
      await page.screenshot({ path: 'registration_filled.png' });
      
      console.log("Submitting form...");
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      
      // Should now be on the Login screen
      const loginText = await page.innerText('body');
      if (loginText.includes('Welcome Back') && loginText.includes('Single Tenant Academy')) {
        console.log("✅ Successfully registered and redirected to Login portal.");
        await page.screenshot({ path: 'login_redirect.png' });
        
        console.log("Logging in with new credentials...");
        await page.fill('input[type="email"]', 'boss@singletenant.local');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1500);
        
        // Verify Dashboard
        const dashText = await page.innerText('body');
        if (dashText.includes('Single Tenant Academy') && dashText.includes('Sign Out')) {
            console.log("✅ Successfully logged in as Admin and reached Dashboard.");
            await page.screenshot({ path: 'dashboard.png' });
            
            console.log("Testing Logout...");
            await page.click('button:has-text("Sign Out")');
            await page.waitForTimeout(1000);
            
            const postLogoutText = await page.innerText('body');
            if (postLogoutText.includes('Welcome Back')) {
                console.log("✅ Successfully signed out.");
            } else {
                console.log("❌ Failed to sign out properly.");
            }
            
            console.log("Testing old seeded admin rejection...");
            await page.fill('input[type="email"]', 'admin@shulesoft.com');
            await page.fill('input[type="password"]', 'admin');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(500);
            
            const errorText = await page.innerText('body');
            if (errorText.includes('Invalid email or password')) {
                console.log("✅ Old seed admin was successfully rejected.");
            } else {
                console.log("❌ SEVERE: Old seed admin was allowed.");
            }

        } else {
            console.log("❌ Failed to reach dashboard. Text:", dashText);
            await page.screenshot({ path: 'dashboard_fail.png' });
        }
      } else {
        console.log("❌ Failed to redirect to login. Text:", loginText);
      }
      
    } else {
      console.log("❌ Not on Registration portal. Text found:", bodyText);
    }
    
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await browser.close();
  }
})();
