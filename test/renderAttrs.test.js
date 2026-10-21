import { renderAttrs } from '../lib/renderAttrs.js';

describe('renderAttrs', () => {
    it('returns empty string for empty input', () => {
        expect(renderAttrs('')).toBe('');
    });

    it('renders style for "-" shorthand', () => {
        expect(renderAttrs('-')).toBe('class="fl-hidden"');
        expect(renderAttrs('--')).toBe('class="fl-hidden fl-hidden"');
    });

    it('renders href for "0" shorthand', () => {
        expect(renderAttrs('0')).toBe('href="javascript:void(0)"');
        expect(renderAttrs('00')).toBe('href="javascript:void(0)" href="javascript:void(0)"');
    });

    it('renders both "-" and "0" shorthands', () => {
        expect(renderAttrs('-0')).toBe('href="javascript:void(0)" class="fl-hidden"');
        expect(renderAttrs('0-')).toBe('href="javascript:void(0)" class="fl-hidden"');
    });

    it('renders id attribute', () => {
        expect(renderAttrs('#foo')).toBe('id="foo"');
        expect(renderAttrs('-#bar')).toBe('id="bar" class="fl-hidden"');
    });

    it('renders class attribute', () => {
        expect(renderAttrs('.foo')).toBe('class="foo"');
        expect(renderAttrs('.foo.bar')).toBe('class="foo bar"');
        expect(renderAttrs('-.foo.bar')).toBe('class="fl-hidden foo bar"');
    });

    it('renders id and class together', () => {
        expect(renderAttrs('#foo.bar')).toBe('id="foo" class="bar"');
        expect(renderAttrs('.foo#bar')).toBe('id="bar" class="foo"');
        expect(renderAttrs('.foo#bar.baz')).toBe('id="bar" class="foo baz"');
    });

    it('renders all shorthands together', () => {
        expect(renderAttrs('-0#foo.bar.baz')).toBe(
            'href="javascript:void(0)" id="foo" class="fl-hidden bar baz"'
        );
    });

    it('ignores invalid shorthands', () => {
        expect(renderAttrs('xyz')).toBe('');
        expect(renderAttrs('1#foo')).toBe('id="foo"');
    });

    it('handles multiple ids, last one wins', () => {
        expect(renderAttrs('#foo#bar')).toBe('id="bar"');
        expect(renderAttrs('.a#foo.b#bar.c')).toBe('id="bar" class="a b c"');
    });

    it('does not add id or class if not present', () => {
        // Lines 47-51: if (id !== null) { ... } if (classes.length > 0) { ... }
        // If neither id nor class is present, nothing should be added.
        expect(renderAttrs('-0')).toBe('href="javascript:void(0)" class="fl-hidden"');
        expect(renderAttrs('')).toBe('');
    });

    it('adds only id if class is not present', () => {
        expect(renderAttrs('#onlyid')).toBe('id="onlyid"');
        expect(renderAttrs('-#onlyid')).toBe('id="onlyid" class="fl-hidden"');
    });

    it('adds only class if id is not present', () => {
        expect(renderAttrs('.onlyclass')).toBe('class="onlyclass"');
        expect(renderAttrs('0.onlyclass')).toBe('href="javascript:void(0)" class="onlyclass"');
    });

    it('trims trailing spaces in result', () => {
        // Should not have trailing spaces even if only one attribute is present
        expect(renderAttrs('-')).toBe('class="fl-hidden"');
        expect(renderAttrs('.foo')).toBe('class="foo"');
        expect(renderAttrs('#foo')).toBe('id="foo"');
    });
});