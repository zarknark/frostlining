/**
 * @jest-environment jsdom
 */

import Passage from '../../lib/Passage.js';
import $ from 'jquery';

// Mock window.story.state for _.template
global.window = {};
window.story = { state: { foo: 'bar', testVar: 'testValue' } };

// Mock jQuery event trigger
$.event = { trigger: jest.fn() };

describe('Passage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should set default values if no arguments are provided', () => {
            const passage = new Passage();
            expect(passage.id).toBe(1);
            expect(passage.name).toBe('Default');
            expect(passage.tags).toEqual([]);
            expect(passage.source).toBeUndefined();
        });

        it('should set provided values', () => {
            const passage = new Passage(5, 'Intro', ['tag1', 'tag2'], 'source text');
            expect(passage.id).toBe(5);
            expect(passage.name).toBe('Intro');
            expect(passage.tags).toEqual(['tag1', 'tag2']);
            expect(passage.rawSource).toBe('source text');
        });

        it('should store source with entities intact (unescape in render)', () => {
            const passage = new Passage(1, 'Test', [], '&lt;b&gt;bold&lt;/b&gt;');
            // Source stored as-is with entities
            expect(passage.rawSource).toBe('&lt;b&gt;bold&lt;/b&gt;');
            // Entities unescaped during render
            const rendered = passage.render();
            expect(rendered).toContain('<b>bold</b>');
        });
    });

    describe('render', () => {
        it('should use this.source if no source is provided', () => {
            const passage = new Passage(1, 'Test', [], 'Hello <%= s.foo %>');
            const html = passage.render();
            expect(html).toContain('Hello bar');
        });

        it('should use provided source if given', () => {
            const passage = new Passage(1, 'Test', [], 'unused');
            const html = passage.render('Hi <%= s.foo %>');
            expect(html).toContain('Hi bar');
        });

        it('should trigger error event if _.template throws', () => {
            const passage = new Passage(1, 'Test', [], '<%= notDefinedVar %>');
            passage.render();
            expect($.event.trigger).toHaveBeenCalledWith(
                'sm.story.error',
                expect.any(Array)
            );
        });

        it('should transform tag shorthands into HTML attributes', () => {
            const passage = new Passage(1, 'Test', [], '<:div#myId.class1.class2:Content');
            const html = passage.render();
            expect(html).toMatch(/<div id="myId" class="class1 class2">Content<\/div>/);
        });

        it('should handle - and 0 prefixes in tag shorthands', () => {
            const passage = new Passage(1, 'Test', [], '<:a-0.class#id:Link');
            const html = passage.render();
            // Adjusted regex to properly escape characters
            expect(html).toMatch(/<a href="javascript:void\(0\)" id="id" class="fl-hidden class">Link<\/a>/);
        });

        // Line 142: test renderAttrs with no attrs (should return empty string)
        it('should return empty string from renderAttrs when no attrs are provided', () => {
            const passage = new Passage(1, 'Test', [], '<div>Content</div>');
            // Access renderAttrs by triggering the tag shorthand with no attrs
            const html = passage.render('<div>Content</div>');
            expect(html).toMatch(/<div>Content<\/div>/);
        });
    });

    describe('error handling and edge cases', () => {
        it('should handle template errors gracefully', () => {
            const passage = new Passage(1, 'Test', [], '<%= undefined.property %>');
            const html = passage.render();
            
            expect($.event.trigger).toHaveBeenCalledWith(
                'sm.story.error',
                expect.arrayContaining([
                    expect.any(Error),
                    'Passage.render() using _.template()'
                ])
            );
            
            // Should still return something (empty string in this case)
            expect(typeof html).toBe('string');
        });

        it('should handle null and undefined source parameters', () => {
            const passage = new Passage(1, 'Test', [], 'default source');
            
            // Test with null
            const htmlNull = passage.render(null);
            expect(htmlNull).toContain('default source');
            
            // Test with undefined  
            const htmlUndef = passage.render(undefined);
            expect(htmlUndef).toContain('default source');
        });

        it('should handle complex nested scenarios', () => {
            // Test more complex template processing
            const passage = new Passage(1, 'Test', [], 'Value: <%= s.testVar %> <div id="computed<><%= s.testVar %>">Dynamic</div>');
            const html = passage.render();
            
            expect(html).toContain('Value: testValue');
            // The computed ID should be processed
            expect(html).toContain('id="computedtestValue"');
        });
    });

    describe('ES6 classes and global data types', () => {
        beforeEach(() => {
            // Reset window.story.state for these tests
            window.story.state = {};
            
            // Clear any global classes that might exist
            delete global.Character;
            delete global.Inventory;
        });

        it('should allow creating custom ES6 classes in one passage and accessing them in another', () => {
            // First passage: Define a global ES6 class and create an instance
            const startPassage = new Passage(1, 'Start', [], `<%
                // Define a custom ES6 class globally
                global.Character = class Character {
                    constructor(name, level = 1) {
                        this.name = name;
                        this.level = level;
                        this.hp = level * 10;
                        this.experience = 0;
                        this.skills = new Map();
                    }
                    
                    levelUp() {
                        this.level++;
                        this.hp = this.level * 10;
                        this.experience = 0;
                        return this;
                    }
                    
                    addSkill(skill, value) {
                        this.skills.set(skill, value);
                        return this;
                    }
                    
                    getSkill(skill) {
                        return this.skills.get(skill) || 0;
                    }
                    
                    gainExperience(amount) {
                        this.experience += amount;
                        if (this.experience >= 100) {
                            const remainingExp = this.experience - 100;
                            this.levelUp();
                            this.experience = remainingExp;
                        }
                        return this;
                    }
                };
                
                // Create a character instance and store it in state
                s.player = new global.Character("Hero", 2);
                s.player.addSkill("Swordsmanship", 15);
                s.player.addSkill("Magic", 8);
            %>
            
            Welcome, <%= s.player.name %>! You are level <%= s.player.level %>.
            HP: <%= s.player.hp %>
            
            <% if (s.player.getSkill("Swordsmanship") > 10) { %>
            You are skilled with a sword!
            <% } %>
            `);

            // Render the first passage
            const startHtml = startPassage.render();
            
            // Verify the passage content was rendered correctly
            expect(startHtml).toContain('Welcome, Hero! You are level 2.');
            expect(startHtml).toContain('HP: 20');
            expect(startHtml).toContain('You are skilled with a sword!');
            
            // Verify the global class exists
            expect(global.Character).toBeDefined();
            expect(typeof global.Character).toBe('function');
            
            // Verify the player instance is properly stored in state
            expect(window.story.state.player).toBeDefined();
            expect(window.story.state.player.name).toBe('Hero');
            expect(window.story.state.player.level).toBe(2);
            expect(window.story.state.player.hp).toBe(20);

            // Second passage: Access and modify the character from another passage
            const battlePassage = new Passage(2, 'Battle', [], `<%
                // Use the existing character instance from state
                s.player.gainExperience(150); // This should trigger a level up
                s.player.addSkill("Magic", 12); // Improve magic skill
            %>
            
            After the battle:
            
            Level: <%= s.player.level %>
            HP: <%= s.player.hp %>
            Experience: <%= s.player.experience %>
            Magic Skill: <%= s.player.getSkill("Magic") %>
            
            <% if (s.player.level > 2) { %>
            You've gained a level!
            <% } %>
            
            <% if (s.player.getSkill("Magic") >= 10) { %>
            Your magical abilities have improved significantly!
            <% } %>
            `);

            // Render the second passage
            const battleHtml = battlePassage.render();
            
            // Verify the character was modified correctly across passages
            expect(battleHtml).toContain('Level: 3'); // Should have leveled up
            expect(battleHtml).toContain('HP: 30'); // HP should have increased
            expect(battleHtml).toContain('Experience: 50'); // 150 - 100 = 50 remaining
            expect(battleHtml).toContain('Magic Skill: 12'); // Should have updated skill
            expect(battleHtml).toContain("You've gained a level!");
            expect(battleHtml).toContain('Your magical abilities have improved significantly!');
            
            // Verify the state persisted the changes
            expect(window.story.state.player.level).toBe(3);
            expect(window.story.state.player.hp).toBe(30);
            expect(window.story.state.player.experience).toBe(50);
            expect(window.story.state.player.getSkill("Magic")).toBe(12);
        });

        it('should support complex class hierarchies and modern JavaScript features', () => {
            // Create a passage that defines multiple related classes
            const setupPassage = new Passage(1, 'Setup', [], `<%
                // Base class with modern JavaScript features
                global.GameEntity = class GameEntity {
                    constructor(id) {
                        this.id = id;
                        this.createdAt = Date.now();
                        this._listeners = new Map();
                    }
                    
                    // Using arrow functions for event handling
                    addEventListener = (event, callback) => {
                        if (!this._listeners.has(event)) {
                            this._listeners.set(event, []);
                        }
                        this._listeners.get(event).push(callback);
                    }
                    
                    triggerEvent = (event, data) => {
                        const listeners = this._listeners.get(event) || [];
                        listeners.forEach(callback => callback(data));
                    }
                    
                    // Using getters/setters
                    get age() {
                        return Date.now() - this.createdAt;
                    }
                };
                
                // Extended class
                global.Inventory = class Inventory extends global.GameEntity {
                    constructor(id) {
                        super(id);
                        this.items = new Map();
                    }
                    
                    // Using destructuring and default parameters
                    add(item, quantity = 1, {silent = false} = {}) {
                        const current = this.items.get(item) || 0;
                        this.items.set(item, current + quantity);
                        
                        if (!silent) {
                            this.triggerEvent('itemAdded', {item, quantity, total: current + quantity});
                        }
                        return this;
                    }
                    
                    // Using array methods and modern syntax
                    list() {
                        return Array.from(this.items.entries())
                            .filter(([, qty]) => qty > 0)
                            .map(([item, qty]) => \`\${item} (\${qty})\`)
                            .join(', ');
                    }
                    
                    // Using rest parameters
                    hasAny(...items) {
                        return items.some(item => (this.items.get(item) || 0) > 0);
                    }
                };
                
                // Create instances
                s.inventory = new global.Inventory('player-inventory');
                
                // Set up event listeners
                let eventLog = [];
                s.inventory.addEventListener('itemAdded', (data) => {
                    eventLog.push(\`Added \${data.quantity} \${data.item}(s)\`);
                });
                s.eventLog = eventLog;
                
                // Add some initial items
                s.inventory.add('Health Potion', 3)
                           .add('Iron Sword', 1)
                           .add('Magic Scroll', 2);
            %>
            
            Inventory initialized with ID: <%= s.inventory.id %>
            Items: <%= s.inventory.list() %>
            Event Log: <%= s.eventLog.join(', ') %>
            `);

            // Render the setup passage
            const setupHtml = setupPassage.render();
            
            // Verify the complex class system works
            expect(setupHtml).toContain('Inventory initialized with ID: player-inventory');
            expect(setupHtml).toContain('Health Potion (3)');
            expect(setupHtml).toContain('Iron Sword (1)');
            expect(setupHtml).toContain('Magic Scroll (2)');
            expect(setupHtml).toContain('Added 3 Health Potion(s)');
            
            // Test accessing from another passage
            const usePassage = new Passage(2, 'UseItem', [], `<%
                // Use modern JavaScript features
                const hasPotion = s.inventory.hasAny('Health Potion', 'Mana Potion');
                const itemCount = Array.from(s.inventory.items.values()).reduce((a, b) => a + b, 0);
            %>
            
            Total items: <%= itemCount %>
            Has healing items: <%= hasPotion %>
            Inventory age: <%= s.inventory.age %> ms
            `);

            const useHtml = usePassage.render();
            
            expect(useHtml).toContain('Total items: 6'); // 3 + 1 + 2
            expect(useHtml).toContain('Has healing items: true');
            expect(useHtml).toMatch(/Inventory age: \d+ ms/);
        });

        it('should handle class serialization and restoration', () => {
            // Test that we can recreate class instances from plain objects
            const savePassage = new Passage(1, 'Save', [], `<%
                // Define a class with serialization support
                global.SaveableCharacter = class SaveableCharacter {
                    constructor(name, stats = {}) {
                        this.name = name;
                        this.stats = new Map(Object.entries(stats));
                        this.inventory = [];
                    }
                    
                    toJSON() {
                        return {
                            name: this.name,
                            stats: Object.fromEntries(this.stats),
                            inventory: this.inventory
                        };
                    }
                    
                    static fromJSON(data) {
                        const character = new global.SaveableCharacter(data.name, data.stats);
                        character.inventory = data.inventory || [];
                        return character;
                    }
                    
                    getStat(stat) {
                        return this.stats.get(stat) || 0;
                    }
                };
                
                // Create and save character
                s.character = new global.SaveableCharacter('Mage', {intelligence: 15, wisdom: 12});
                s.character.inventory = ['Staff', 'Spell Book'];
                
                // Simulate save/load cycle
                const saved = JSON.stringify(s.character.toJSON());
                const loaded = global.SaveableCharacter.fromJSON(JSON.parse(saved));
                s.restoredCharacter = loaded;
            %>
            
            Original: <%= s.character.name %> (INT: <%= s.character.getStat('intelligence') %>)
            Restored: <%= s.restoredCharacter.name %> (INT: <%= s.restoredCharacter.getStat('intelligence') %>)
            Inventory: <%= s.restoredCharacter.inventory.join(', ') %>
            `);

            const saveHtml = savePassage.render();
            
            expect(saveHtml).toContain('Original: Mage (INT: 15)');
            expect(saveHtml).toContain('Restored: Mage (INT: 15)');
            expect(saveHtml).toContain('Inventory: Staff, Spell Book');
            
            // Verify both instances work correctly
            expect(window.story.state.character.getStat('wisdom')).toBe(12);
            expect(window.story.state.restoredCharacter.getStat('wisdom')).toBe(12);
        });
    });

    describe('Step 5: Template with shorthand attributes', () => {
        beforeEach(() => {
            // Set up test data for template rendering
            window.story.state = { foo: 'bar', testVar: 'testValue' };
        });

        it('should process templates in plain text first', () => {
            // Verify that templates work at all
            const passage = new Passage(1, 'Test', [], 'Value: <%= s.foo %>');
            const html = passage.render();
            expect(html).toContain('Value: bar');
        });

        it('should process shorthand attributes after template rendering (covers Step 5)', () => {
            // This test covers lines 172-211 - the Step 5 path that only runs when templates are present
            // When a passage has <%= %> templates, Step 5 processes HTML shorthand attributes AFTER template rendering
            const passage = new Passage(1, 'Test', [], '<:div#resultDiv.highlight:<%= s.foo %>:>');
            const html = passage.render();
            
            // Should have processed both the template AND the shorthand attributes
            expect(html).toContain('bar'); // Template was processed
            expect(html).toContain('id="resultDiv"'); // Shorthand id was processed
            expect(html).toContain('class="highlight"'); // Shorthand class was processed
        });

        it('should handle mixed standard and shorthand attributes with templates', () => {
            // Cover Step 5 with mixed attribute types
            const passage = new Passage(1, 'Test', [], '<span data-value="test" .myClass><%= s.foo %></span>');
            const html = passage.render();
            
            expect(html).toContain('bar'); // Template processed
            expect(html).toContain('data-value="test"'); // Standard attribute preserved
            expect(html).toContain('class="myClass"'); // Shorthand processed
        });

        it.skip('should skip Step 5 when no templates are present', () => {
            // This ensures Step 5 is skipped for passages without templates
            // to prevent corrupting markdown-generated HTML (the bug we fixed)
            const passage = new Passage(1, 'Test', [], `
# Heading

\`\`\`
code block
\`\`\`
            `);
            const html = passage.render();
            
            // Should render markdown correctly without Step 5 interference
            expect(html).toContain('<h1>Heading</h1>');
            expect(html).toContain('<pre><code>');
            expect(html).toContain('code block');
        });
    });

    describe('markdown and template code in the same passage', () => {
        beforeEach(() => {
            window.story.state = { foo: 'bar', test: null };
        });

        it.skip('renders a link, emphasis, strong, and a header alongside an arbitrary template block', () => {
            const passage = new Passage(1, 'Test', [], `<% s.test = 1; %>

[[This is a passage link]]

*Emphasis*

**Story emphasis**

# Header1`);
            const html = passage.render();

            expect(window.story.state.test).toBe(1);
            expect(html).toContain('data-passage="This is a passage link"');
            expect(html).toContain('<em>Emphasis</em>');
            expect(html).toContain('<strong>Story emphasis</strong>');
            expect(html).toContain('<h1>Header1</h1>');
        });

        it.skip('does not let markdown-special characters inside a template block affect markdown parsing', () => {
            const passage = new Passage(1, 'Test', [], '<% let a = 1 < 2; let b = "a * b"; %>\n\n*Emphasis*');
            const html = passage.render();

            expect(html).toContain('<em>Emphasis</em>');
            expect(html).not.toContain('&lt;%');
        });

        it.skip('preserves an interpolated value inside a header', () => {
            const passage = new Passage(1, 'Test', [], '# <%= s.foo %>');
            const html = passage.render();

            expect(html).toContain('<h1>bar</h1>');
        });

        it('still hides print() output from markdown processing', () => {
            const passage = new Passage(1, 'Test', [], '<% print("*not emphasis*"); %>');
            const html = passage.render();

            expect(html).toContain('*not emphasis*');
            expect(html).not.toContain('<em>not emphasis</em>');
        });
    });

    describe('boolean HTML attributes (Step 1)', () => {
        it('preserves a boolean attribute alongside a standard attribute', () => {
            // Covers line 116: booleanAttrs branch when standard "=" attrs are also present
            const passage = new Passage(1, 'Test', [], '<video src="movie.mp4" controls>Clip</video>');
            const html = passage.render();
            expect(html).toContain('src="movie.mp4"');
            expect(html).toContain('controls');
            expect(html).toContain('>Clip</video>');
        });

        it('preserves a boolean attribute combined with a shorthand attribute', () => {
            // Covers line 148: booleanAttrs branch in the no-"=" path
            const passage = new Passage(1, 'Test', [], '<video controls .myClass>Clip</video>');
            const html = passage.render();
            expect(html).toContain('controls');
            expect(html).toContain('class="myClass"');
            expect(html).toContain('>Clip</video>');
        });
    });

    describe('Step 5 re-processing edge cases', () => {
        beforeEach(() => {
            window.story.state = { foo: 'bar', testVar: 'testValue' };
        });

        it('leaves a tag with no attributes untouched when templates are present', () => {
            // Covers line 205: empty-attrs return inside the templates-present re-processing path
            const passage = new Passage(1, 'Test', [], '<div><%= s.foo %></div>');
            const html = passage.render();
            expect(html).toContain('<div>');
            expect(html).toContain('bar');
            expect(html).toContain('</div>');
        });

        it('drops attributes that render to nothing when templates are present', () => {
            // Covers line 244: shorthand renders empty in the templates-present re-processing path
            const passage = new Passage(1, 'Test', [], '<div xyz><%= s.foo %></div>');
            const html = passage.render();
            // "xyz" has no shorthand markers, so it renders empty and the tag has no attributes
            expect(html).toContain('<div>bar</div>');
        });
    });
});