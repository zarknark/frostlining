import AstGenerator from '../../lib/compiler/AstGenerator.js';
import Renderer from "../../lib/compiler/Renderer.js";
import $ from 'jquery';
import Lexer from "../../lib/compiler/Lexer.js";

// Mock window.story.state for _.template
global.window = {};

// Mock jQuery event trigger
$.event = { trigger: jest.fn() };

const lexer = new Lexer();
const generator = new AstGenerator();
const renderer = new Renderer();

describe('Renderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    renderer.debugCounter = 0;
  });

  describe('Basic input', () => {
    it('UnderscoreTemplate', () => {
      let input = [
          "<% console.log('Hello World') %>",
          "Hello, <%= getName() %>",
          "<%- 1+2 %>",
      ];

      input.forEach((item) => {
        let ast = generator.generateAst(lexer.tokenize(item));
        let output = renderer.renderAst(ast);
        expect(output).toBe(item);
      });
    });

    it('TwineLink', () => {
      let inputAndResult = [
        {
          input: '[[label|destination]]',
          output: '<a href="javascript:void(0)" data-passage="destination">label</a>'
        },
        {
          input: '[[label->destination]]',
          output: '<a href="javascript:void(0)" data-passage="destination">label</a>'
        },
        {
          input: '[[destination]]',
          output: '<a href="javascript:void(0)" data-passage="destination">destination</a>'
        },
        {
          input: '[[destination<-label]]',
          output: '<a href="javascript:void(0)" data-passage="destination" is-embed=true>label</a>'
        },
        {
          input: '[[<|new_location]]',
          output: '<a href="javascript:void(0)" data-passage="<%= new_location %>"><%= new_location %></a>'
        },
        {
          input: '[[<|new_location|destination]]',
          output: '<a href="javascript:void(0)" data-passage="destination"><%= new_location %></a>'
        }
      ];

      inputAndResult.forEach((item) => {
        let ast = generator.generateAst(lexer.tokenize(item.input));
        let output = renderer.renderAst(ast);
        expect(output).toBe(item.output);
      });
    });

    it('FrostliningInterpolate', () => {
      let inputAndResult = [
        {
          input: "<|variable_name",
          output: "<%= variable_name %>"
        },
        {
          input: "<|object.field",
          output: "<%= object.field %>"
        }
      ];


      inputAndResult.forEach((item) => {
        let ast = generator.generateAst(lexer.tokenize(item.input));
        let output = renderer.renderAst(ast);
        expect(output).toBe(item.output);
      });
    });

    it('FrostliningConditional', () => {
      let inputAndResult = [
        {
          input: "<? midnight === 'true' ? The clock struck midnight. ?>",
          output: "<% if (midnight === 'true') { %>The clock struck midnight.<% } %>"
        },
        {
          input: "<? midnight === 'true' ? The clock struck midnight. | The clock ticked quietly. ?>",
          output: "<% if (midnight === 'true') { %>The clock struck midnight.<% } else { %>The clock ticked quietly.<% } %>"
        }
      ];

      inputAndResult.forEach((item) => {
        let ast = generator.generateAst(lexer.tokenize(item.input));
        let output = renderer.renderAst(ast);
        expect(output).toBe(item.output);
      });
    });

    it('FrostliningHtmlShorthand', () => {
      let inputAndResult = [
        {
          input:`
          <:.chapter-start#start.text:
            In my younger and more vulnerable years my father gave me some advice
            that I’ve been turning over in my mind ever since.
          :>
          <::
            "Whenever you feel like criticizing anyone," he told me, "just remember 
            that all the people in this world haven't had the advantages that 
            you've had."
          :>`,
          output: `
          <p id="start" class="chapter-start text">
            In my younger and more vulnerable years my father gave me some advice
            that I’ve been turning over in my mind ever since.         
          </p>
          <p>
            "Whenever you feel like criticizing anyone," he told me, "just remember 
            that all the people in this world haven't had the advantages that 
            you've had."         
          </p>`
        }
      ];

      inputAndResult.forEach((item) => {
        let ast = generator.generateAst(lexer.tokenize(item.input));
        let output = renderer.renderAst(ast).split("\n").map((e) => e.trim());
        let expected = item.output.split("\n").map((e) => e.trim());

        expect(output).toStrictEqual(expected);
      });
    });

    it('FrostliningFootnote', () => {
      let inputAndResult = [
        {
          input: '<& Click me! | Your computer is now infected with chlamydia. &>',
          output: '<span id="id-0" class="fl-label">Click me!</span>' +
              '<span id="id-0-footnote" class="fl-footnote fl-hidden">Your computer is now infected with chlamydia.</span>' +
              '<script>$("#id-0").on("click",toggleFootnote)</script>'
        }
      ]

      renderer.debugMode = true;

      inputAndResult.forEach((item) => {
        let ast = generator.generateAst(lexer.tokenize(item.input));
        let output = renderer.renderAst(ast);
        expect(output).toBe(item.output);
      });
    });

    it('Source & Newline', () => {
      let input = [
        "<a href='https://example.com'>test-link<\\a>",
        "<h1 className='title' id='main-title'>H1 Heading</h1>",
        "<p id='second-para'>This is the second paragraph. It includes <strong>bold</strong> and <em>emphasized</em> text.</p>\n<p data-test='paragraph-with-data'>This paragraph has a data attribute.</p>",
        "<h2>Deeply Nested Elements</h2>\n" +
          "<div class='level-1'>\n" +
          "<div class='level-2'>\n" +
          "<div class='level-3'>\n" +
          "<div class='level-4'>\n" +
          "<div class='level-5'>\n" +
          "<p class='deep-text'>This text is nested 5 levels deep</p>\n" +
          "</div>\n" +
          "</div>\n" +
          "</div>\n" +
          "</div>\n" +
          "</div>\n" +
          "<p>Selector challenge: <code>.level-1 .level-3 .level-5 p</code></p>"
      ]

      input.forEach((item) => {
        let ast = generator.generateAst(lexer.tokenize(item));
        let output = renderer.renderAst(ast);
        expect(output).toBe(item);
      });
    });

    it('Edgecases', () => {

      let input = [
          "<script> if (time === 'midnight' || time === 'noon') { print('The clock struck twelve.'); }</script>",
          "<script> if (time === 'midnight' && time === 'noon') { print('The clock twitches, then slowly starts to melt.'); }</script>",
          "Welcome, <%= s.player.name %>! You are level <%= s.player.level %>.\n" +
            "HP: <%= s.player.hp %>\n\n" +
            "<% if (s.player.getSkill(\"Swordsmanship\") > 10) { %> You are skilled with a sword! <% } %>",
      ];

      input.forEach((item) => {
        let tokens = lexer.tokenize(item);
        let ast = generator.generateAst(tokens);
        let output = renderer.renderAst(ast);
        expect(output).toBe(item);
      });
    });
    it('Complex parsing', () => {
      let inputAndResult = [
        {
          input: `
              <? _previousRoom === 'Outside' ? Shaking the rain from your [[cloak->Cloak]], you step gratefully inside. ?> 
              
              You are standing in a <& spacious hall | It is splendidly decorated in red and gold, with glittering chandeliers overhead &>.
              
              The entrance from the street is to the [[north->Outside]], and there are doorways [[south->Bar]] and [[west->Cloakroom]].
          `,
          output: (
              "\n<% if (_previousRoom === 'Outside') { %>" +
                "Shaking the rain from your <a href=\"javascript:void(0)\" data-passage=\"Cloak\">cloak</a>, " +
                "you step gratefully inside." +
              "<% } %>\n\n" +
              "You are standing in a <span id=\"id-0\" class=\"fl-label\">spacious hall</span>" +
              "<span id=\"id-0-footnote\" class=\"fl-footnote fl-hidden\">It is splendidly decorated in red and gold, " +
              "with glittering chandeliers overhead</span><script>$(\"#id-0\").on(\"click\",toggleFootnote)</script>.\n\n" +
              "The entrance from the street is to the <a href=\"javascript:void(0)\" data-passage=\"Outside\">north</a>, " +
              "and there are doorways <a href=\"javascript:void(0)\" data-passage=\"Bar\">south</a> and " +
              "<a href=\"javascript:void(0)\" data-passage=\"Cloakroom\">west</a>.\n"
          )
        }
      ];

      renderer.debugMode = true;

      inputAndResult.forEach((item) => {
        let ast = generator.generateAst(lexer.tokenize(item.input));
        let output = renderer.renderAst(ast);
        expect(output).toBe(item.output);
      });
    });
  })
});

