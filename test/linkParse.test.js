import linkParse from '../lib/linkParse.js';

describe('parse', () => {
    it('throws TypeError if input is not a string', () => {
        expect(() => linkParse.parse(null)).toThrow(TypeError);
        expect(() => linkParse.parse(undefined)).toThrow(TypeError);
        expect(() => linkParse.parse(123)).toThrow(TypeError);
        expect(() => linkParse.parse({})).toThrow(TypeError);
        expect(() => linkParse.parse([])).toThrow(TypeError);
    });

    it('returns the same string if there are no links', () => {
        expect(linkParse.parse('Hello world')).toBe('Hello world');
        expect(linkParse.parse('No links here!')).toBe('No links here!');
    });

    it('parses [[destination]]', () => {
        expect(linkParse.parse('Go to [[Home]]')).toBe('Go to <a href="javascript:void(0)" data-passage="Home">Home</a>');
    });

    it('parses [[rename|destination]]', () => {
        const text = 'Go to [[Start|Home]]';
        const result = linkParse.parse(text);
        expect(result).toBe('Go to <a href="javascript:void(0)" data-passage="Home">Start</a>');
    });

    it('parses [[rename->destination]]', () => {
        expect(linkParse.parse('Go to [[Click here->Home]]')).toBe('Go to <a href="javascript:void(0)" data-passage="Home">Click here</a>');
    });

    it('parses [[destination<-rename]]', () => {
        expect(linkParse.parse('Go to [[Home<-Click here]]')).toBe('Go to <a href="javascript:void(0)" data-passage="Home">Click here</a>');
    });

    it('parses multiple links in one string', () => {
        const text = '[[A]] and [[B|C]] and [[D|E]] and [[F|G]]';
        const result = linkParse.parse(text);
        expect(result).toBe('<a href="javascript:void(0)" data-passage="A">A</a> and <a href="javascript:void(0)" data-passage="C">B</a> and <a href="javascript:void(0)" data-passage="E">D</a> and <a href="javascript:void(0)" data-passage="G">F</a>');
    });

    it('returns original text for malformed links', () => {
        expect(linkParse.parse('[[not closed')).toBe('[[not closed');
        expect(linkParse.parse('[[foo|bar|baz]]')).toBe('[[foo|bar|baz]]');
        expect(linkParse.parse('[[foo->bar->baz]]')).toBe('[[foo->bar->baz]]');
        expect(linkParse.parse('[[foo<-bar<-baz]]')).toBe('[[foo<-bar<-baz]]');
    });

    it('handles links with spaces and special characters', () => {
        const text = '[[Go|My Page!]]';
        const result = linkParse.parse(text);
        expect(result).toBe('<a href="javascript:void(0)" data-passage="My Page!">Go</a>');
    });

    it('does not replace text outside of link patterns', () => {
        expect(linkParse.parse('[[A]] is not [[B')).toBe('<a href="javascript:void(0)" data-passage="A">A</a> is not [[B');
    });

    it('should return empty string when given empty string', () => {
        expect(linkParse.parse('')).toBe('');
    });

    it('parses [[destination]] with a dash in the passage name', () => {
        expect(linkParse.parse('[[abc-def]]')).toBe('<a href="javascript:void(0)" data-passage="abc-def">abc-def</a>');
    });

    it('parses [[rename|destination]] with dashes in both names', () => {
        expect(linkParse.parse('[[start-here|end-there]]')).toBe('<a href="javascript:void(0)" data-passage="end-there">start-here</a>');
    });

    it('parses [[rename->destination]] with dashes in both names', () => {
        expect(linkParse.parse('[[start-here->end-there]]')).toBe('<a href="javascript:void(0)" data-passage="end-there">start-here</a>');
    });

    it('parses [[destination<-rename]] with dashes in both names', () => {
        expect(linkParse.parse('[[end-there<-start-here]]')).toBe('<a href="javascript:void(0)" data-passage="end-there">start-here</a>');
    });
});