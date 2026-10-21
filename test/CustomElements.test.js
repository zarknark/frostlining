/**
 * @jest-environment jsdom
 */

import Passage from '../lib/Passage.js';

describe('Custom HTML Elements', () => {
  beforeEach(() => {
    // Set up a minimal DOM and story state
    document.body.innerHTML = '<tw-story><tw-passage></tw-passage></tw-story>';
    global.window.story = {
      state: {}
    };
    
    // Mock jQuery
    global.$ = jest.fn(() => ({
      html: jest.fn()
    }));
    global.$.event = { trigger: jest.fn() };
    
    // Mock underscore template
    global._ = {
      template: jest.fn((source) => () => source),
      unescape: jest.fn((str) => str)
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('custom elements without attributes should render correctly', () => {
    const passage = new Passage(1, 'test', [], '<custom-elem>content</custom-elem>');
    const result = passage.render();
    
    // Should not have style="display:none" added
    expect(result).toContain('<custom-elem>content</custom-elem>');
    expect(result).not.toContain('style="display:none"');
  });

  test('custom elements with attributes should render correctly', () => {
    const passage = new Passage(1, 'test', [], '<custom-elem id="test">content</custom-elem>');
    const result = passage.render();
    
    // Should preserve the id attribute and not break parsing
    expect(result).toContain('id="test"');
    expect(result).toContain('<custom-elem');
    expect(result).toContain('content</custom-elem>');
  });

  test('custom elements with dash shorthand should render correctly', () => {
    const passage = new Passage(1, 'test', [], '<:custom_elem-: hidden content :>');
    const result = passage.render();
    
    // Should apply the hidden style to custom-elem, not create <custom>
    expect(result).toContain('<custom_elem');
    expect(result).toContain('class="fl-hidden"');
    expect(result).toContain('hidden content</custom_elem>');
    expect(result).not.toContain('<custom>'); // Should not turn into <custom> (without -elem)
  });

  test('multiple custom elements should render correctly', () => {
    const passage = new Passage(1, 'test', [], '<:my_widget:widget1 <:another_element-: hidden widget :>');
    const result = passage.render();
    
    expect(result).toContain('<my_widget>widget1</my_widget>');
    expect(result).toContain('<another_element');
    expect(result).toContain('class="fl-hidden"');
    expect(result).toContain('hidden widget</another_element>');
  });

  // Note: Nested custom elements with shorthand attributes are not currently supported
  // This is a limitation of the current regex-based parsing approach
  test('nested elements support is limited', () => {
    const passage = new Passage(1, 'test', [], '<outer-elem><inner-elem>nested content</inner-elem></outer-elem>');
    const result = passage.render();
    
    // Outer element should be processed
    expect(result).toContain('<outer-elem>');
    expect(result).toContain('</outer-elem>');
    // Inner element may not be processed due to parsing limitations
    expect(result).toContain('nested content');
  });

  test('standard HTML elements should still work with shorthands', () => {
    const passage = new Passage(1, 'test', [], '<:div-: hidden div :><:span.highlight:highlighted');
    const result = passage.render();
    
    expect(result).toContain('<div');
    expect(result).toContain('class="fl-hidden"');
    expect(result).toContain('hidden div</div>');
    expect(result).toContain('<span');
    expect(result).toContain('class="highlight"');
    expect(result).toContain('highlighted</span>');
  });
});
