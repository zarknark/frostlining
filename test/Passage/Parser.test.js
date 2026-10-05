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
      expect(parser.CLASSNAMES).toEqual(/[A-Za-z-_ ]/);
    });
  })

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
    })

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
    })

    it('should omit all whitespace between newlines', () => {
      const parser = new Parser();

      let input = "\n   \n\t\t\t\n"
      let tokens

      tokens = parser.tokenize(input);
      expect(tokens.length).toBe(3);
      tokens.forEach( (token) => { expect(token).toStrictEqual({type: 'newline', value: '\n'}) })
    })
  });
})
