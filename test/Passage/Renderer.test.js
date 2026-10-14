import Parser from '../../lib/passage/Parser.js';
import Renderer from "../../lib/passage/Renderer.js";
import $ from 'jquery';

// Mock window.story.state for _.template
global.window = {};

// Mock jQuery event trigger
$.event = { trigger: jest.fn() };

describe('Renderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic input', () => {
    it('UnderscoreTemplate', () => {
      let input = [
          "<% console.log('Hello World') %>",
          "Hello, <%= getName() %>",
          "<%- 1+2 %>",
      ];

      const parser = new Parser();
      const renderer = new Renderer();
      input.forEach((item) => {
        let ast = parser.toAst(parser.tokenize(item));
        let output = renderer.astToPassageTemplate(ast);
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

      const parser = new Parser();
      const renderer = new Renderer();
      inputAndResult.forEach((item) => {
        let ast = parser.toAst(parser.tokenize(item.input));
        let output = renderer.astToPassageTemplate(ast);
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

      const parser = new Parser();
      const renderer = new Renderer();

      inputAndResult.forEach((item) => {
        let ast = parser.toAst(parser.tokenize(item.input));
        let output = renderer.astToPassageTemplate(ast);
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

      const parser = new Parser();
      const renderer = new Renderer();

      inputAndResult.forEach((item) => {
        let ast = parser.toAst(parser.tokenize(item.input));
        let output = renderer.astToPassageTemplate(ast);
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

      const parser = new Parser();
      const renderer = new Renderer();

      inputAndResult.forEach((item) => {
        let ast = parser.toAst(parser.tokenize(item.input));
        let output = renderer.astToPassageTemplate(ast).split("\n").map((e) => e.trim());
        let expected = item.output.split("\n").map((e) => e.trim());

        expect(output).toStrictEqual(expected);
      });
    });

    it('FrostliningFootnote', () => {
      let inputAndResult = [
        {
          input: '<& Click me! | Your computer is now infected with chlamydia. &>',
          output: '<span id="id-0" class="footnote-label">Click me!</span>' +
              '<span id="id-0-footnote" class="footnote fl-hidden">Your computer is now infected with chlamydia.</span>' +
              '<script>$("#id-0").on("click",toggleFootnote)</script>'
        }
      ]

      const parser = new Parser();
      const renderer = new Renderer();
      renderer.debugMode = true;

      inputAndResult.forEach((item) => {
        let ast = parser.toAst(parser.tokenize(item.input));
        let output = renderer.astToPassageTemplate(ast);
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

      const parser = new Parser();
      const renderer = new Renderer();
      input.forEach((item) => {
        let ast = parser.toAst(parser.tokenize(item));
        let output = renderer.astToPassageTemplate(ast);
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

      const parser = new Parser();
      const renderer = new Renderer();
      renderer.debugMode = true;

      inputAndResult.forEach((item) => {
        let ast = parser.toAst(parser.tokenize(item.input));
        let output = renderer.astToPassageTemplate(ast);
        expect(output).toBe(item.output);
      });
    });
  })
});

