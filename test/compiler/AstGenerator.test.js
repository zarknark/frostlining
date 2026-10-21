import AstGenerator from '../../lib/compiler/AstGenerator.js';
import Lexer from "../../lib/compiler/Lexer.js";

// Mock window.story.state for _.template
global.window = {};
window.story = { state: { foo: 'bar', testVar: 'testValue' } };

const lexer = new Lexer();
const parser = new AstGenerator();

describe('AstGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ast-creation', () => {
    describe('valid input tests', () => {
      it("should handle basic underscore templating", () => {

        let input = '<% if (s.hour === "midnight") { %>';
        let tokens = lexer.tokenize(input);
        let ast = parser.generateAst(tokens);

        expect(ast).toStrictEqual({
          type: 'Passage',
          children: [
            {
              type: 'UnderscoreTemplate',
              children: [
                {
                  type: 'Source',
                  value: 'if (s.hour === "midnight") {'
                }]
            }]
        });

        input = 'Hello, <%= getName() %>';
        tokens = lexer.tokenize(input);
        ast = parser.generateAst(tokens);

        expect(ast).toStrictEqual({
          type: 'Passage',
          children: [
            {
              type: 'Source',
              value: 'Hello,'
            },
            {
              type: 'UnderscoreInterpolate',
              children: [
                {
                  type: 'Source',
                  value: 'getName()'
                }
              ]
            }]
        });

        input = '<%- getModalSource() %>';
        tokens = lexer.tokenize(input);
        ast = parser.generateAst(tokens);

        expect(ast).toStrictEqual({
          type: 'Passage',
          children: [
            {
              type: 'UnderscoreInterpolateEscaped',
              children: [
                {
                  type: 'Source',
                  value: 'getModalSource()'
                }
              ]
            }]
        });
      })

      it("should handle Twine links", () => {
        let input = '[[One Fish|one]], [[Two Fish->two]], [[Red Fish]], [[blue<-Blue Fish]]';
        let ast = parser.generateAst(lexer.tokenize(input));

        expect(ast).toStrictEqual({
          type: 'Passage',
          children: [
            {
              type: 'TwineLink',
              label: [{type: 'Source', value: 'One Fish'}],
              passage: [{type: 'Source', value: 'one'}],
              isEmbed: false
            },
            { type: 'Source', value: ',' },
            {
              type: 'TwineLink',
              label: [{type: 'Source', value: 'Two Fish'}],
              passage: [{type: 'Source', value: 'two'}],
              isEmbed: false
            },
            { type: 'Source', value: ',' },
            {
              type: 'TwineLink',
              label: [],
              passage: [{type: 'Source', value: 'Red Fish'}],
              isEmbed: false
            },
            { type: 'Source', value: ',' },
            {
              type: 'TwineLink',
              label: [{type: 'Source', value: 'Blue Fish'}],
              passage: [{type: 'Source', value: 'blue'}],
              isEmbed: true
            }
          ]
        });
      });

      it("should hande variable markup", () => {
        let input = 'Hello, <|user.name !'
        let ast = parser.generateAst(lexer.tokenize(input));

        expect(ast).toStrictEqual({
          type: 'Passage',
          children: [
            { type: 'Source', value: 'Hello,' },
            {
              type: 'FrostliningInterpolate',
              value: 'user.name'
            },
            { type: 'Source', value: '!' }
          ]
        });
      });

      it("should handle basic conditional statements", () => {
        let input = '<? s.hour === "midnight" ? The clock struck midnight. ?>'
        let ast = parser.generateAst(lexer.tokenize(input));

        expect(ast).toStrictEqual({
          type: 'Passage',
          children: [
            {
              type: 'FrostliningConditional',
              conditional: 's.hour === "midnight"',
              ifChildren: [{
                type: 'Source',
                value: 'The clock struck midnight.'
              }],
              elseChildren: []
            }
          ]
        })

        input = '<? s.hour === "midnight" ? The clock struck midnight. | The clock ticked quietly. ?>'
        ast = parser.generateAst(lexer.tokenize(input));

        expect(ast).toStrictEqual({
          type: 'Passage',
          children: [
            {
              type: 'FrostliningConditional',
              conditional: 's.hour === "midnight"',
              ifChildren: [{
                type: 'Source',
                value: 'The clock struck midnight.'
              }],
              elseChildren: [{
                type: 'Source',
                value: 'The clock ticked quietly.'
              }]
            }
          ]
        });
      });

      it("should handle frostlining html shorthand", () => {
        let input = `
        <:.chapter-start#start.text:
          In my younger and more vulnerable years my father gave me some advice
          that I’ve been turning over in my mind ever since.
        :>
        <::
          "Whenever you feel like criticizing anyone," he told me, "just remember
           that all the people in this world haven't had the advantages that 
           you've had."     
        :>`;
        let ast = parser.generateAst(lexer.tokenize(input));
        expect(ast).toStrictEqual({
          type: 'Passage',
          children: [
            {type: 'Newline', value: '\n'},
            {
              type: 'FrostliningHtmlShorthand',
              tag: 'p',
              id: 'start',
              javascriptVoid: false,
              classes: ['chapter-start', 'text'],
              children: [
                {type: 'Newline', value: '\n'},
                {type: 'Source', value: 'In my younger and more vulnerable years my father gave me some advice'},
                {type: 'Newline', value: '\n'},
                {type: 'Source', value: 'that I’ve been turning over in my mind ever since.'},
                {type: 'Newline', value: '\n'},
              ]
            },
            {type: 'Newline', value: '\n'},
            {
              type: 'FrostliningHtmlShorthand',
              tag: 'p',
              id: '',
              javascriptVoid: false,
              classes: [],
              children: [
                {type: 'Newline', value: '\n'},
                {type: 'Source', value: '"Whenever you feel like criticizing anyone," he told me, "just remember'},
                {type: 'Newline', value: '\n'},
                {type: 'Source', value: 'that all the people in this world haven\'t had the advantages that'},
                {type: 'Newline', value: '\n'},
                {type: 'Source', value: 'you\'ve had."'},
                {type: 'Newline', value: '\n'},
              ]
            }
          ]
        })

        input = `
        <:: Because she loved you so :>
        <:: Pretty as a picture that you <:em: didn't post :> :>
        <:: Lookin' at you like you're made of <:em: solid gold :> :>
        <:: Never <:em:official / You mention you're <:em:single to the girls at the bar :>
        <:: And you hate this song :>
        <:: But you wake up on the train with your <:em: headphones gone :> :>
        <:: Then that melody is <:em: all you want :> :>
        <:: You never knew that it was <:em:Babylon / 'Til it was gone :>
        `
        ast = parser.generateAst(lexer.tokenize(input));
        expect(ast.children.length).toBe(17);
        expect(ast.children[0]).toStrictEqual({type: 'Newline', value: '\n'});
        expect(ast.children[1]).toStrictEqual({
          type: 'FrostliningHtmlShorthand',
          tag: 'p',
          id: '',
          javascriptVoid: false,
          classes: [],
          children: [{type: 'Source', value: 'Because she loved you so'}]
        });
        expect(ast.children[3]).toStrictEqual({
          type: 'FrostliningHtmlShorthand',
          tag: 'p',
          id: '',
          javascriptVoid: false,
          classes: [],
          children: [
            {type: 'Source', value: 'Pretty as a picture that you'},
            {
              type: 'FrostliningHtmlShorthand',
              tag: 'em',
              id: '',
              javascriptVoid: false,
              classes: [],
              children: [{type: 'Source', value: 'didn\'t post'}]
            }
          ]
        });
        expect(ast.children[7]).toStrictEqual({
          type: 'FrostliningHtmlShorthand',
          tag: 'p',
          id: '',
          javascriptVoid: false,
          classes: [],
          children: [
            {type: 'Source', value: 'Never'},
            {
              type: 'FrostliningHtmlShorthand',
              tag: 'em',
              id: '',
              javascriptVoid: false,
              classes: [],
              children: [{type: 'Source', value: 'official'}]
            },
            {type: 'Source', value: '/ You mention you\'re'},
            {
              type: 'FrostliningHtmlShorthand',
              tag: 'em',
              id: '',
              javascriptVoid: false,
              classes: [],
              children: [{type: 'Source', value: 'single'}]
            },
            {type: 'Source', value: 'to the girls at the bar'}
          ]
        });
      });

      it("should handle frostlining footnotes", () => {
        let input = '<& Click me! | Your computer is now infected with chlamydia. &>';
        let ast = parser.generateAst(lexer.tokenize(input));

        expect(ast).toStrictEqual({
          type: 'Passage',
          children: [
            {
              type: 'FrostliningFootnote',
              label: [{ type: 'Source', value: 'Click me!' }],
              children: [{ type: 'Source', value: 'Your computer is now infected with chlamydia.'}]
            }
          ]
        })
      });

      describe("Edgecases", () => {
        it("Bracketed text", () => {
          let input = (`<script> this._listeners.set(event, []); </script>`);

          let ast = parser.generateAst(lexer.tokenize(input));

          expect(ast).toStrictEqual({
            type: 'Passage',
            children: [
              {
                type: 'Source',
                value: '<script> this._listeners.set(event,'
              },
              {
                type: 'BracketedText',
                children: []
              },
              {
                type: 'Source',
                value: '); </script>'
              }
            ]
          });

          input = `<script> const listeners = this._listeners.get(event) || []; </script>`;
          ast = parser.generateAst(lexer.tokenize(input));

          expect(ast).toStrictEqual({
            type: 'Passage',
            children: [
              {
                type: 'Source',
                value: '<script> const listeners = this._listeners.get(event) ||'
              },
              {
                type: 'BracketedText',
                children: []
              },
              {
                type: 'Source',
                value: '; </script>'
              }
            ]
          });
        })
      })
    })

    // TODO: describe('invalid input tests', () => {})
  })
});
