import Lexer from "../../lib/compiler/Lexer.js";

// Mock window.story.state for _.template
global.window = {};
window.story = { state: { foo: 'bar', testVar: 'testValue' } };

const lexer = new Lexer();

describe('Lexer', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    lexer.tokenLine = 0;
    lexer.tokenChar = 0;
  });

  describe('constructor', () => {
    it('should set default values if no arguments are provided', () => {
      expect(lexer.workingText).toBe('');
      expect(lexer.INLINE_WS).toEqual(/[ \t]/);
      expect(lexer.NEWLINE_WS).toEqual(/[\r\n]/);
      expect(lexer.SHORTHAND_CHARS).toEqual(/[A-Za-z-_.# ]/);
    });
  });

  describe('tokenizer', () => {
    describe('whitespace parsing', () => {
      it('should return no tokens if input only contains inline whitespace', () => {
        let tokens = lexer.tokenize("   ");
        expect(tokens.length).toBe(0);

        tokens = lexer.tokenize("\t \t");
        expect(tokens.length).toBe(0);
      });

      it('should return all newlines', () => {
        let input = "\n\n\n"
        let tokens

        tokens = lexer.tokenize(input);
        expect(tokens.length).toBe(3);
        tokens.forEach( (token) => { expect(token).toMatchObject({type: 'newline', value: '\n'}) })

        tokens = lexer.tokenize(input);
        expect(tokens.length).toBe(3);
        tokens.forEach( (token) => { expect(token).toMatchObject({type: 'newline', value: '\n'}) })
      });

      it('should omit all whitespace between newlines', () => {
        let input = "\n   \n\t\t\t\n"
        let tokens

        tokens = lexer.tokenize(input);
        expect(tokens.length).toBe(3);
        tokens.forEach( (token) => { expect(token).toMatchObject({type: 'newline', value: '\n'}) })
      });
    });

    describe('Underscore parsing', () => {
      it('should recognize basic opening and closing tags', () => {
        let tokens = lexer.tokenize("<%%>");

        expect(tokens.length).toBe(2);
        expect(tokens[0]).toStrictEqual({type: 'underscore-start', value: '<%', pos: [0,0]});
        expect(tokens[1]).toStrictEqual({type: 'underscore-end', value: '%>', pos: [0,2]});

        tokens = lexer.tokenize("<% print('Hello World') %>");
        expect(tokens.length).toBe(3);
        expect(tokens[0]).toMatchObject({type: 'underscore-start', value: '<%'});
        expect(tokens[1]).toMatchObject({type: 'source', value: 'print(\'Hello World\')'});
        expect(tokens[2]).toMatchObject({type: 'underscore-end', value: '%>'});

      });

      it('should recognize interpolate-type opening tags', () => {
        let tokens = lexer.tokenize("<%=%>");

        expect(tokens.length).toBe(2);
        expect(tokens[0]).toMatchObject({type: 'underscore-interp-start', value: '<%='});
        expect(tokens[1]).toMatchObject({type: 'underscore-end', value: '%>'});

        tokens = lexer.tokenize("<%= story.helloWorld %>");
        expect(tokens.length).toBe(3);
        expect(tokens[0]).toMatchObject({type: 'underscore-interp-start', value: '<%='});
        expect(tokens[1]).toMatchObject({type: 'source', value: 'story.helloWorld'});
        expect(tokens[2]).toMatchObject({type: 'underscore-end', value: '%>'});
      })

      it('should recognize interpolate-and-escape-type opening tags', () => {
        let tokens = lexer.tokenize("<%-%>");

        expect(tokens.length).toBe(2);
        expect(tokens[0]).toMatchObject({type: 'underscore-interp-esc-start', value: '<%-'});
        expect(tokens[1]).toMatchObject({type: 'underscore-end', value: '%>'});

        tokens = lexer.tokenize("<%- <br>\n story.helloWorld <br> \n%>");
        expect(tokens.length).toBe(6);
        expect(tokens[0]).toMatchObject({type: 'underscore-interp-esc-start', value: '<%-'});
        expect(tokens[1]).toMatchObject({type: 'source', value: '<br>'});
        expect(tokens[2]).toMatchObject({type: 'newline', value: '\n'});
        expect(tokens[3]).toMatchObject({type: 'source', value: 'story.helloWorld <br>'});
        expect(tokens[4]).toMatchObject({type: 'newline', value: '\n'});
        expect(tokens[5]).toMatchObject({type: 'underscore-end', value: '%>'});
      })
    });

    describe('Link parsing', () => {
      it('should parse normal links', () => {
        let tokens = lexer.tokenize("[[source|dest_passage]]");

        expect(tokens.length).toBe(5);
        expect(tokens[0]).toMatchObject({type: 'tw-link-start', value: '[['});
        expect(tokens[1]).toMatchObject({type: 'source', value: 'source'});
        expect(tokens[2]).toMatchObject({type: 'pipe', value: '|'});
        expect(tokens[3]).toMatchObject({type: 'source', value: 'dest_passage'});
        expect(tokens[4]).toMatchObject({type: 'tw-link-end', value: ']]'});
      })

      it('should parse arrow links', () => {
        let tokens = lexer.tokenize("[[source->dest_passage]]");

        expect(tokens.length).toBe(5);
        expect(tokens[0]).toMatchObject({type: 'tw-link-start', value: '[['});
        expect(tokens[1]).toMatchObject({type: 'source', value: 'source'});
        expect(tokens[2]).toMatchObject({type: 'arrow', value: '->'});
        expect(tokens[3]).toMatchObject({type: 'source', value: 'dest_passage'});
        expect(tokens[4]).toMatchObject({type: 'tw-link-end', value: ']]'});
      })

      it('should parse destination-only links', () => {
        let tokens = lexer.tokenize("[[dest_passage]]");

        expect(tokens.length).toBe(3);
        expect(tokens[0]).toMatchObject({type: 'tw-link-start', value: '[['});
        expect(tokens[1]).toMatchObject({type: 'source', value: 'dest_passage'});
        expect(tokens[2]).toMatchObject({type: 'tw-link-end', value: ']]'});
      })

      it('should parse embed links', () => {
        let tokens = lexer.tokenize("[[dest_passage<-source]]");

        expect(tokens.length).toBe(5);
        expect(tokens[0]).toMatchObject({type: 'tw-link-start', value: '[['});
        expect(tokens[1]).toMatchObject({type: 'source', value: 'dest_passage'});
        expect(tokens[2]).toMatchObject({type: 'rev-arrow', value: '<-'});
        expect(tokens[3]).toMatchObject({type: 'source', value: 'source'});
        expect(tokens[4]).toMatchObject({type: 'tw-link-end', value: ']]'});
      })
    });


    describe('Frostlining parsing', () => {
      // '<|[var_name]'
      it('should parse varname tags with words', () => {
        let tokens = lexer.tokenize("<|variable_name");

        expect(tokens.length).toBe(2);
        expect(tokens[0]).toMatchObject({type: 'fl-variable', value: '<|'});
        expect(tokens[1]).toMatchObject({type: 'word', value: 'variable_name'});

        tokens = lexer.tokenize("<|variable_name \n\n");
        expect(tokens.length).toBe(4);
        expect(tokens[0]).toMatchObject({type: 'fl-variable', value: '<|'});
        expect(tokens[1]).toMatchObject({type: 'word', value: 'variable_name'});
        expect(tokens[2]).toMatchObject({type: 'newline', value: '\n'});
        expect(tokens[3]).toMatchObject({type: 'newline', value: '\n'});
      })

      it('should deal with trailing periods appropriately', () => {
        let tokens = lexer.tokenize("<|variable_name.");
        expect(tokens.length).toBe(3);
        expect(tokens[0]).toMatchObject({type: 'fl-variable', value: '<|'});
        expect(tokens[1]).toMatchObject({type: 'word', value: 'variable_name'});
        expect(tokens[2]).toMatchObject({type: 'source', value: '.'});
      })

      it('should not parse words when whitespace follows a varname tag', () => {
        let tokens = lexer.tokenize("<|\n\nvariable-name ");

        expect(tokens.length).toBe(4);
        expect(tokens[0]).toMatchObject({type: 'fl-variable', value: '<|'});
        expect(tokens[1]).toMatchObject({type: 'newline', value: '\n'});
        expect(tokens[2]).toMatchObject({type: 'newline', value: '\n'});
        expect(tokens[3]).toMatchObject({type: 'source', value: 'variable-name'});

        tokens = lexer.tokenize("<| variable-name ");
        expect(tokens.length).toBe(2);
        expect(tokens[0]).toMatchObject({type: 'fl-variable', value: '<|'});
        expect(tokens[1]).toMatchObject({type: 'source', value: 'variable-name'});
      })

      // Conditional tags
      it('should parse basic conditional text', () => {
        let tokens = lexer.tokenize(
            "<? hour === 'midnight' ? The clock struck twelve. ?>");

        expect(tokens.length).toBe(3);
        expect(tokens[0]).toMatchObject({type: 'fl-conditional-start', value: 'hour === \'midnight\''})
        expect(tokens[1]).toMatchObject({type: 'source', value: 'The clock struck twelve.'})
        expect(tokens[2]).toMatchObject({type: 'fl-conditional-end', value: '?>'})
      })

      it('should parse conditional text with else statements', () => {
        let tokens = lexer.tokenize(
            "<? hour === 'midnight' ? The clock struck twelve. | The clock ticked quietly. ?>");

        expect(tokens.length).toBe(5);
        expect(tokens[0]).toMatchObject({type: 'fl-conditional-start', value: 'hour === \'midnight\''})
        expect(tokens[1]).toMatchObject({type: 'source', value: 'The clock struck twelve.'})
        expect(tokens[2]).toMatchObject({type: 'pipe', value: '|'})
        expect(tokens[3]).toMatchObject({type: 'source', value: 'The clock ticked quietly.'})
        expect(tokens[4]).toMatchObject({type: 'fl-conditional-end', value: '?>'})
      })

      // HTML shorthand: '<:[html-shorthand]:' ':>'
      it('should parse basic html shorthand', () => {
        let tokens = lexer.tokenize("<:em: The clock struck twelve. :>");

        expect(tokens.length).toBe(3);
        expect(tokens[0]).toMatchObject({type: 'fl-html-start', value: 'em'})
        expect(tokens[1]).toMatchObject({type: 'source', value: 'The clock struck twelve.'})
        expect(tokens[2]).toMatchObject({type: 'fl-html-end', value: ':>'})

        tokens = lexer.tokenize("<:p.fl-hidden: The clock ticked quietly. :>");

        expect(tokens.length).toBe(3);
        expect(tokens[0]).toMatchObject({type: 'fl-html-start', value: 'p.fl-hidden'})
        expect(tokens[1]).toMatchObject({type: 'source', value: 'The clock ticked quietly.'})
        expect(tokens[2]).toMatchObject({type: 'fl-html-end', value: ':>'})
      })

      // Click-for-footnote: '<& [ source ] | footnote &>'
      it('parses footnotes correctly', () => {
        let tokens = lexer.tokenize(
            "He muttered, \"I'm from <& England | England: a foreign country far across the sea. &>.\"");

        expect(tokens.length).toBe(7);
        expect(tokens[0]).toMatchObject({type: 'source', value: 'He muttered, "I\'m from'});
        expect(tokens[1]).toMatchObject({type: 'fl-footnote-start', value: '<&'});
        expect(tokens[2]).toMatchObject({type: 'source', value: 'England'});
        expect(tokens[3]).toMatchObject({type: 'pipe', value: '|'});
        expect(tokens[4]).toMatchObject({type: 'source', value: 'England: a foreign country far across the sea.'});
        expect(tokens[5]).toMatchObject({type: 'fl-footnote-end', value: '&>'});
        expect(tokens[6]).toMatchObject({type: 'source', value: '."'});
      })
    });

    // DO THIS ONLY AFTER MAKING SURE BASIC PASSAGE FUNCTIONALITY WORKS.
    describe('Frostlining dialogue parsing', () => {
      // '<<<' '>>>' (start / end dialogue section)
      it("should recognize dialogue opening and closing tags", () => {
        let tokens = lexer.tokenize('<<< abc >>>');

        expect(tokens.length).toBe(3);
        expect(tokens[0]).toMatchObject({type: 'fl-dialogue-start', value: '<<<'});
        expect(tokens[1]).toMatchObject({type: 'source', value: 'abc'});
        expect(tokens[2]).toMatchObject({type: 'fl-dialogue-end', value: '>>>'});

      });

      // ';;' (dialogue break)
      it("should recognize dialogue breaks", () => {
        let tokens = lexer.tokenize(
            "<<< " +
            "Waitin' for the soldier to come back again ;; " +
            "Nevermore to be alone ;; " +
            "When the letter said, \"A soldier's comin' home\" " +
            ">>>");

        expect(tokens.length).toBe(7);
        expect(tokens[0]).toMatchObject({type: 'fl-dialogue-start', value: '<<<'});
        expect(tokens[1]).toMatchObject({type: 'source', value: 'Waitin\' for the soldier to come back again'});
        expect(tokens[2]).toMatchObject({type: 'fl-dialogue-break', value: ';;'});
        expect(tokens[3]).toMatchObject({type: 'source', value: 'Nevermore to be alone'});
        expect(tokens[4]).toMatchObject({type: 'fl-dialogue-break', value: ';;'});
        expect(tokens[5]).toMatchObject({type: 'source', value: 'When the letter said, "A soldier\'s comin\' home"'});
        expect(tokens[6]).toMatchObject({type: 'fl-dialogue-end', value: '>>>'});

      });

      // '<>' (glue)
      it("should recognize glue tags", () => {
        let tokens = lexer.tokenize('Hello, <> World!');

        expect(tokens.length).toBe(3);
        expect(tokens[0]).toMatchObject({type: 'source', value: 'Hello,'});
        expect(tokens[1]).toMatchObject({type: 'fl-glue', value: '<>'});
        expect(tokens[2]).toMatchObject({type: 'source', value: 'World!'});

      });

      // '<   >' (explicit whitespace)
      it("should recognize explicit whitespace", () => {
        let tokens = lexer.tokenize('<   \t>');

        expect(tokens.length).toBe(1);
        expect(tokens[0]).toMatchObject({type: 'fl-whitespace', value: '<   \t>'});
      });

      it("should not parse explicit whitespace if another character is present", () => {
        let tokens = lexer.tokenize('<   t>');

        expect(tokens.length).toBe(1);
        expect(tokens[0]).toMatchObject({type: 'source', value: '<   t>'});
      })

      // Recognize bracketed text
      it("should recognize bracketed text", () => {
        let tokens = lexer.tokenize('[ Divine dissatisfaction ]');

        expect(tokens.length).toBe(3);
        expect(tokens[0]).toMatchObject({type: 'sq-bracket-open', value: '['});
        expect(tokens[1]).toMatchObject({type: 'source', value: 'Divine dissatisfaction'});
        expect(tokens[2]).toMatchObject({type: 'sq-bracket-closed', value: ']'});

      });

      // '==' (knots)

      // '*' '**' ... (choices)

      // '-' '--' ... (gathers)

      // '-> <knot-name>' (diverts)

      // '* <source> [ <source> ]' '** <source> [ <source> ]' ... (choice-only text)

      // '* -> <knot>' '** -> <knot>' '*** -> <knot>' (fallback choice)

      // '* <? condition ? <source>'
      // '** <? condition ? <source>'
      // '*** <? condition ? <source>'
      // (conditional choice)
    });

    describe('HTML parsing (or the lack of it)', () => {
      it('should pass all valid HTML elements through as text', () => {
        // Several test cases taken from https://demodorigatsuo.github.io/minisoup-test-site/index.html
        let inputAndResult = [
          {
            input: "<a href='https://example.com'>test-link<\\a>",
            expected: [ { type: 'source', value: "<a href='https://example.com'>test-link<\\a>" } ]
          },
          {
            input: "<h1 className='title' id='main-title'>H1 Heading</h1>",
            expected: [ { type: 'source', value: "<h1 className='title' id='main-title'>H1 Heading</h1>" } ]
          },
          {
            input: "<p id='second-para'>This is the second paragraph. It includes <strong>bold</strong> and <em>emphasized</em> text.</p>\n<p data-test='paragraph-with-data'>This paragraph has a data attribute.</p>",
            expected: [
              { type: 'source', value: "<p id='second-para'>This is the second paragraph. It includes <strong>bold</strong> and <em>emphasized</em> text.</p>" },
              { type: 'newline', value: "\n" },
              { type: 'source', value: "<p data-test='paragraph-with-data'>This paragraph has a data attribute.</p>"}
            ]
          },
          {
            input: "" +
                "            <h2>Deeply Nested Elements</h2>\n" +
                "            <div class='level-1'>\n" +
                "                <div class='level-2'>\n" +
                "                    <div class='level-3'>\n" +
                "                        <div class='level-4'>\n" +
                "                            <div class='level-5'>\n" +
                "                                <p class='deep-text'>This text is nested 5 levels deep</p>\n" +
                "                            </div>\n" +
                "                        </div>\n" +
                "                    </div>\n" +
                "                </div>\n" +
                "            </div>\n" +
                "            <p>Selector challenge: <code>.level-1 .level-3 .level-5 p</code></p>",
            expected: [
              { type: 'source', value: "<h2>Deeply Nested Elements</h2>" }, { type: 'newline', value: "\n" },
              { type: 'source', value: "<div class='level-1'>" }, { type: 'newline', value: "\n" },
              { type: 'source', value: "<div class='level-2'>" }, { type: 'newline', value: "\n" },
              { type: 'source', value: "<div class='level-3'>" }, { type: 'newline', value: "\n" },
              { type: 'source', value: "<div class='level-4'>" }, { type: 'newline', value: "\n" },
              { type: 'source', value: "<div class='level-5'>" }, { type: 'newline', value: "\n" },
              { type: 'source', value: "<p class='deep-text'>This text is nested 5 levels deep</p>" }, { type: 'newline', value: "\n" },
              { type: 'source', value: "</div>" }, { type: 'newline', value: "\n" },
              { type: 'source', value: "</div>" }, { type: 'newline', value: "\n" },
              { type: 'source', value: "</div>" }, { type: 'newline', value: "\n" },
              { type: 'source', value: "</div>" }, { type: 'newline', value: "\n" },
              { type: 'source', value: "</div>" }, { type: 'newline', value: "\n" },
              { type: 'source', value: "<p>Selector challenge: <code>.level-1 .level-3 .level-5 p</code></p>" },
            ]
          },
          {
            input: (
              `<script>
                addEventListener = (event, callback) => {
                  if (!this._listeners.has(event)) {
                      this._listeners.set(event, []);
                    }
                    this._listeners.get(event).push(callback);
                  }
              </script>`),
            expected: [
              { type: 'source', value: '<script>' }, { type: 'newline', value: "\n" },
              { type: 'source', value: 'addEventListener = (event, callback) => {' }, { type: 'newline', value: "\n" },
              { type: 'source', value: 'if (!this._listeners.has(event)) {' }, { type: 'newline', value: "\n" },
              { type: 'source', value: 'this._listeners.set(event,' },
              { type: 'sq-bracket-open', value: '['}, { type: 'sq-bracket-closed', value: ']'}, { type: 'source', value: ');' },
              { type: 'newline', value: "\n" },
              { type: 'source', value: '}' }, { type: 'newline', value: "\n" },
              { type: 'source', value: 'this._listeners.get(event).push(callback);' }, { type: 'newline', value: "\n" },
              { type: 'source', value: '}' }, { type: 'newline', value: "\n" },
              { type: 'source', value: '</script>' }
            ]
          }
        ]
        inputAndResult.forEach((item) => {
          let tokens = lexer.tokenize(item.input)
          expect(tokens).toMatchObject(item.expected)
        });
      });
    });

    describe('complex parsing tests', () => {
      it('should correctly parse a passage with multiple different types of tags, some of them nested.', () => {
        const input =
            `<? _previousRoom === 'Outside' ? Shaking the rain from your [[cloak->Cloak]], you step gratefully inside. ?> 
            
            You are standing in a <& spacious hall | It is splendidly decorated in red and gold, with glittering chandeliers overhead &>.
            
            The entrance from the street is to the [[north->Outside]], and there are doorways [[south->Bar]] and [[west->Cloakroom]]."`

        let tokens = lexer.tokenize(input);
        expect(tokens.length).toBe(39);
        expect(tokens[0]).toMatchObject({type: 'fl-conditional-start', value: '_previousRoom === \'Outside\''})
        expect(tokens[1]).toMatchObject({type: 'source', value: 'Shaking the rain from your'})
        expect(tokens[2]).toMatchObject({type: 'tw-link-start', value: '[['})
        expect(tokens[3]).toMatchObject({type: 'source', value: 'cloak'})
        expect(tokens[4]).toMatchObject({type: 'arrow', value: '->'})
        expect(tokens[5]).toMatchObject({type: 'source', value: 'Cloak'})
        expect(tokens[6]).toMatchObject({type: 'tw-link-end', value: ']]'})
        expect(tokens[7]).toMatchObject({type: 'source', value: ', you step gratefully inside.'})
        expect(tokens[8]).toMatchObject({type: 'fl-conditional-end', value: '?>'})
      })
    })

    describe('invalid input tests', () => {
      it('should reject non-string input', () => {
        function tokenizeNonString() {
          lexer.tokenize(42);
        }
        expect(tokenizeNonString).toThrow('non-string input')
      })

    });
  });
});
