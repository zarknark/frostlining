import Parser from '../../lib/passage/Parser.js';
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
      const parser = new Parser();
      expect(parser.workingText).toBe('');
      expect(parser.beginningOfLine).toBe(true);
      expect(parser.INLINE_WS).toEqual(/[ \t]/);
      expect(parser.NEWLINE_WS).toEqual(/[\r\n]/);
      expect(parser.STYLING_NAMES).toEqual(/[A-Za-z-_ ]/);
    });
  });

  describe('whitespace parsing', () => {
    it('should return no tokens if beginningOfLine=true and input only contains inline whitespace', () => {
      const parser = new Parser();

      let tokens = parser.tokenize("   ");
      expect(tokens.length).toBe(0);

      parser.beginningOfLine = true;
      tokens = parser.tokenize("\t \t");
      expect(tokens.length).toBe(0);
    });

    it('should return exact input if beginningOfLine=false, even if input only contains inline whitespace', () => {
      const parser = new Parser();

      let input = "   "
      let tokens

      parser.beginningOfLine = false;
      tokens = parser.tokenize(input);
      expect(tokens.length).toBe(1);
      expect(tokens[0]).toStrictEqual({type: 'text', value: input})
      parser.beginningOfLine = false;

      input = "\t   \t"
      parser.beginningOfLine = false;
      tokens = parser.tokenize(input);
      expect(tokens.length).toBe(1);
      expect(tokens[0]).toStrictEqual({type: 'text', value: input})
    });

    it('should return all newlines, regardless of the value of beginningOfLine', () => {
      const parser = new Parser();

      let input = "\n\n\n"
      let tokens

      parser.beginningOfLine = true;
      tokens = parser.tokenize(input);
      expect(tokens.length).toBe(3);
      tokens.forEach( (token) => { expect(token).toStrictEqual({type: 'newline', value: '\n'}) })

      parser.beginningOfLine = false;
      tokens = parser.tokenize(input);
      expect(tokens.length).toBe(3);
      tokens.forEach( (token) => { expect(token).toStrictEqual({type: 'newline', value: '\n'}) })
    });

    it('should omit all whitespace between newlines', () => {
      const parser = new Parser();

      let input = "\n   \n\t\t\t\n"
      let tokens

      tokens = parser.tokenize(input);
      expect(tokens.length).toBe(3);
      tokens.forEach( (token) => { expect(token).toStrictEqual({type: 'newline', value: '\n'}) })
    });
  });

  describe('HTML parsing (or the lack of it)', () => {
    it('should pass all valid HTML elements through as text', () => {
      const parser = new Parser();

      // Several test cases taken from https://demodorigatsuo.github.io/minisoup-test-site/index.html
      let inputAndResult = [
        {
          input: "<a href='https://example.com'>test-link<\\a>",
          expected: [ { type: 'text', value: "<a href='https://example.com'>test-link<\\a>" } ]
        },
        {
          input: "<h1 className='title' id='main-title'>H1 Heading</h1>",
          expected: [ { type: 'text', value: "<h1 className='title' id='main-title'>H1 Heading</h1>" } ]
        },
        {
          input: "<p id='second-para'>This is the second paragraph. It includes <strong>bold</strong> and <em>emphasized</em> text.</p>\n<p data-test='paragraph-with-data'>This paragraph has a data attribute.</p>",
          expected: [
            { type: 'text', value: "<p id='second-para'>This is the second paragraph. It includes <strong>bold</strong> and <em>emphasized</em> text.</p>" },
            { type: 'newline', value: "\n" },
            { type: 'text', value: "<p data-test='paragraph-with-data'>This paragraph has a data attribute.</p>"}
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
            { type: 'text', value: "<h2>Deeply Nested Elements</h2>" }, { type: 'newline', value: "\n" },
            { type: 'text', value: "<div class='level-1'>" }, { type: 'newline', value: "\n" },
            { type: 'text', value: "<div class='level-2'>" }, { type: 'newline', value: "\n" },
            { type: 'text', value: "<div class='level-3'>" }, { type: 'newline', value: "\n" },
            { type: 'text', value: "<div class='level-4'>" }, { type: 'newline', value: "\n" },
            { type: 'text', value: "<div class='level-5'>" }, { type: 'newline', value: "\n" },
            { type: 'text', value: "<p class='deep-text'>This text is nested 5 levels deep</p>" }, { type: 'newline', value: "\n" },
            { type: 'text', value: "</div>" }, { type: 'newline', value: "\n" },
            { type: 'text', value: "</div>" }, { type: 'newline', value: "\n" },
            { type: 'text', value: "</div>" }, { type: 'newline', value: "\n" },
            { type: 'text', value: "</div>" }, { type: 'newline', value: "\n" },
            { type: 'text', value: "</div>" }, { type: 'newline', value: "\n" },
            { type: 'text', value: "<p>Selector challenge: <code>.level-1 .level-3 .level-5 p</code></p>" },
          ]
        }
      ]
      inputAndResult.forEach((item) => {
        parser.beginningOfLine = true
        let tokens = parser.tokenize(item.input)
        expect(tokens).toStrictEqual(item.expected)
      });

    })
  });
})
