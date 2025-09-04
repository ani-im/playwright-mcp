const camelToKebab = (prop: string) =>
    prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  
  function pickActualValue(
    all: Record<string, string>,
    name: string
  ): string | undefined {
    if (name in all) return all[name];
    const kebab = camelToKebab(name);
    if (kebab in all) return all[kebab];
    const trimmed = name.trim();
    if (trimmed in all) return all[trimmed];
    const trimmedKebab = camelToKebab(trimmed);
    if (trimmedKebab in all) return all[trimmedKebab];
    return undefined;
  }
  
  // Function to parse RGB color values from various CSS color formats
  function parseRGBColor(colorValue: string): { r: number; g: number; b: number } | null {
    if (!colorValue) return null;
    
    // Handle rgb(r, g, b) format
    const rgbMatch = colorValue.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3])
      };
    }
    
    // Handle rgba(r, g, b, a) format (ignore alpha)
    const rgbaMatch = colorValue.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1]),
        g: parseInt(rgbaMatch[2]),
        b: parseInt(rgbaMatch[3])
      };
    }
    
    // Handle hex colors (#RRGGBB or #RGB)
    const hexMatch = colorValue.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/);
    if (hexMatch) {
      const hex = hexMatch[1];
      if (hex.length === 3) {
        // #RGB format
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16)
        };
      } else {
        // #RRGGBB format
        return {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16)
        };
      }
    }
    
    // Handle named colors (basic support)
    const namedColors: Record<string, { r: number; g: number; b: number }> = {
      'red': { r: 255, g: 0, b: 0 },
      'green': { r: 0, g: 128, b: 0 },
      'blue': { r: 0, g: 0, b: 255 },
      'black': { r: 0, g: 0, b: 0 },
      'white': { r: 255, g: 255, b: 255 },
      'gray': { r: 128, g: 128, b: 128 },
      'grey': { r: 128, g: 128, b: 128 },
      'yellow': { r: 255, g: 255, b: 0 },
      'cyan': { r: 0, g: 255, b: 255 },
      'magenta': { r: 255, g: 0, b: 255 },
      'orange': { r: 255, g: 165, b: 0 },
      'purple': { r: 128, g: 0, b: 128 },
      'pink': { r: 255, g: 192, b: 203 },
      'brown': { r: 165, g: 42, b: 42 },
      'darkred': { r: 139, g: 0, b: 0 },
      'lightblue': { r: 173, g: 216, b: 230 },
      'darkblue': { r: 0, g: 0, b: 139 },
      'lightgreen': { r: 144, g: 238, b: 144 },
      'darkgreen': { r: 0, g: 100, b: 0 }
    };
    
    const lowerColor = colorValue.toLowerCase().trim();
    if (namedColors[lowerColor]) {
      return namedColors[lowerColor];
    }
    
    return null;
  }
  
  // Function to check if RGB color is within specified range
  function isColorInRange(actualColor: string, range: { minR: number; maxR: number; minG: number; maxG: number; minB: number; maxB: number }): boolean {
    const rgb = parseRGBColor(actualColor);
    if (!rgb) return false;
    
    return rgb.r >= range.minR && rgb.r <= range.maxR &&
           rgb.g >= range.minG && rgb.g <= range.maxG &&
           rgb.b >= range.minB && rgb.b <= range.maxB;
  }
  
  
  async function getAllComputedStylesDirect(
    tab: any,
    ref: string,
    element: string
  ): Promise<Record<string, string>> {
    const locator = await tab.refLocator({ ref, element });
  
    const allStyles: Record<string, string> = await locator.evaluate(
      (el: Element) => {
        const cs = window.getComputedStyle(el);
        const out: Record<string, string> = {};
        for (let i = 0; i < cs.length; i++) {
          const name = cs[i]; // kebab-case
          out[name] = cs.getPropertyValue(name);
        }
        return out;
      }
    );
  
    return allStyles;
  }



  async function getAllDomPropsDirect(tab: any, ref: string, element: string) {
    const locator = await tab.refLocator({ ref, element });
  
    const props = await locator.evaluate(
      (el: Element) => {
        if (!el) return {};
  
        const out: Record<string, any> = {};
  
        // Collect all "own" properties of the element
        for (const key of Object.keys(el)) {
          try {
            const val = (el as any)[key];
            // filter only primitives for readability
            if (["string", "number", "boolean"].includes(typeof val) || val === null) {
              out[key] = val;
            }
          } catch (_) {
            // skip getters with errors
          }
        }
  
        // + useful attributes
        if (el.getAttributeNames) {
          el.getAttributeNames().forEach((attr: string) => {
            out[`attr:${attr}`] = el.getAttribute(attr);
          });
        }
  
        // Handle special cases for common attributes
        // For disabled attribute, check both the property and the attribute
        if (el.hasAttribute('disabled')) {
          out['disabled'] = true;
        } else if ((el as any).disabled !== undefined) {
          out['disabled'] = (el as any).disabled;
        }
  
        // For checked attribute, check both the property and the attribute
        if (el.hasAttribute('checked')) {
          out['checked'] = true;
        } else if ((el as any).checked !== undefined) {
          out['checked'] = (el as any).checked;
        }
  
        // For value attribute, prioritize the property over attribute
        if ((el as any).value !== undefined) {
          out['value'] = (el as any).value;
        } else if (el.hasAttribute('value')) {
          out['value'] = el.getAttribute('value');
        }
  
        return out;
      }
    );
  
    return props ?? {};
  }


  // Function to check if alert dialog is present in snapshot
function hasAlertDialog(snapshotContent: string): boolean {
  // Check for dialog information in the snapshot
  const hasModalState = snapshotContent.includes('### Modal state');
  const hasDialogMessage = snapshotContent.includes('dialog with message');
  const hasNoModalState = snapshotContent.includes('There is no modal state present');
  
  console.log('hasModalState:', hasModalState);
  console.log('hasDialogMessage:', hasDialogMessage);
  console.log('hasNoModalState:', hasNoModalState);
  
  return hasModalState && hasDialogMessage && !hasNoModalState;
}

// Function to extract alert dialog text from snapshot
function getAlertDialogText(snapshotContent: string): string | null {
  if (!hasAlertDialog(snapshotContent)) {
    return null;
  }
  
  // Look for dialog message pattern: "dialog with message "text""
  const dialogMatch = snapshotContent.match(/dialog with message "([^"]+)"/);
  if (dialogMatch) {
    return dialogMatch[1];
  }
  
  return null;
}

// Helper function to perform regex-based checks
function performRegexCheck(responseData: string, check: any) {
    try {
      switch (check.type) {
        case 'regex_extract':
          return performRegexExtract(responseData, check);
        
        case 'regex_match':
          return performRegexMatch(responseData, check);
        
  
        
        default:
          return { passed: false, actual: 'Unknown check type' };
      }
    } catch (error) {
      return { passed: false, actual: `Error: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
  
  function performRegexExtract(responseData: string, check: any) {
    const regex = new RegExp(check.pattern, 'i');
    const match = responseData.match(regex);
    
    if (!match) {
      return { passed: false, actual: 'Pattern not found' };
    }
    
    const extractedValue = match[check.extractGroup || 1];
    if (extractedValue === undefined) {
      return { passed: false, actual: `Capture group ${check.extractGroup || 1} not found` };
    }
    
    // If no expected value, just return success
    if (check.expected === undefined) {
      return { passed: true, actual: extractedValue };
    }
    
    // Compare extracted value with expected
    return compareValues(extractedValue, check.expected, check.operator);
  }
  
  function performRegexMatch(responseData: string, check: any) {
    const regex = new RegExp(check.pattern, 'i');
    const isMatch = regex.test(responseData);
    
    // For regex_match, just return the test result
    return { passed: isMatch, actual: isMatch ? 'Pattern matched' : 'Pattern not matched' };
  }
  
  
  
  
  
  function compareValues(actual: any, expected: any, operator: string) {
    switch (operator) {
      case 'equals':
        // Convert both to same type for comparison
        if (typeof actual === 'number' && typeof expected === 'string') {
          return { passed: actual === Number(expected), actual };
        } else if (typeof actual === 'string' && typeof expected === 'number') {
          return { passed: Number(actual) === expected, actual };
        } else {
          return { passed: actual === expected, actual };
        }
      case 'not_equals':
        if (typeof actual === 'number' && typeof expected === 'string') {
          return { passed: actual !== Number(expected), actual };
        } else if (typeof actual === 'string' && typeof expected === 'number') {
          return { passed: Number(actual) !== expected, actual };
        } else {
          return { passed: actual !== expected, actual };
        }
      case 'contains':
        return { passed: String(actual).includes(String(expected)), actual };
      case 'not_contains':
        return { passed: !String(actual).includes(String(expected)), actual };
      case 'greater_than':
        return { passed: Number(actual) > Number(expected), actual };
      case 'less_than':
        return { passed: Number(actual) < Number(expected), actual };
      default:
        return { passed: false, actual: `Unknown operator: ${operator}` };
    }
  }

export { pickActualValue, parseRGBColor, isColorInRange, getAllComputedStylesDirect, getAllDomPropsDirect, hasAlertDialog, getAlertDialogText, performRegexCheck, performRegexExtract, performRegexMatch, compareValues };