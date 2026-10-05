export default class Parser {

  workingText = ''
  beginningOfLine = true

  INLINE_WS=/[ \t]/;
  NEWLINE_WS=/[\r\n]/;
  STYLING_NAMES = /[A-Za-z-_.# ]/


  tokenize(input) {
    if (typeof input != "string") {
      console.log("Parse error: non-string input")
      throw "ERROR: non-string input (Parser.tokenize)"
    }

    let currentPos = 0;
    let tokens = [];


    while (currentPos < input.length) {
      let char = input[currentPos];

      // skip until the first non-space, non-tab character in a line.
      if (this.beginningOfLine) {
        while (currentPos < input.length && this.INLINE_WS.test(input[currentPos])) {

          currentPos += 1;
        }

        this.beginningOfLine = false;
        continue;
      }

      // newline handling
      if (this.NEWLINE_WS.test(char)) {
        this.pushToken(tokens, {type: 'newline', value: '\n'});
        this.beginningOfLine = true;

        currentPos += 1;
        continue;
      }

      /*
       * Possible opening template tag
       */
      if (char === '<') {
        if (currentPos + 1 < input.length) {
          let nextChar = input[currentPos + 1]

          // Check for frostlining dialogue start: '<<<'
          if (nextChar === '<' &&
              currentPos + 2 < input.length && input[currentPos + 2] === '<') {
            this.pushToken(tokens, {type: 'fl-dialogue-start', value: '<<<'});

            currentPos += 3;
            continue;
          }
          // Check for underscore template opening tag: '<%'
          else if (nextChar === '%') {
            this.pushToken(tokens, {type: "underscore-start", value: "<%"});
            currentPos += 2;
            continue;
          }
          // Check for frostlining var-substitution opening tag: '<|[var_name]'
          else if (nextChar === '|') {
            this.pushToken(tokens, {type: 'fl-varsub-start', value: '<|'});
            currentPos += 2;
            currentPos = this.pushNextWord(input, currentPos, tokens)
            continue;
          }
          // Check for frostlining conditional statement: '<? [JS_expr] ? [text] (| [text] ?>)'
          else if (nextChar === '?') {
            let conditionalEndPos = currentPos + 1;
            let conditional = ''
            while (conditionalEndPos < input.length && input[conditionalEndPos] !== '?') {
              conditional += input[conditionalEndPos]

              conditionalEndPos += 1;
            }
            if (conditionalEndPos < input.length && input[conditionalEndPos] === '?') {
              this.pushToken(tokens, {type: 'fl-conditional-start', value: `${conditional}`});
              currentPos = conditionalEndPos + 1;
              currentPos = this.pushNextWord(input, currentPos, tokens)
              continue;
            }
          } else if (this.STYLING_NAMES.test(nextChar)) {
            // Check for frostlining styling markup: '<[fl-styling-names]: [text] (:>)'
            let stylingNamePos = currentPos + 1;
            let stylingNames = nextChar;
            while (stylingNamePos < input.length && this.STYLING_NAMES.test(input[stylingNamePos])) {
              stylingNames += input[stylingNamePos];
              stylingNamePos += 1;
            }
            if (input[stylingNamePos] === ':') {
              this.pushToken(tokens, {type: 'fl-styling-start', value: `${stylingNames}`})
              currentPos = stylingNamePos + 1;
              currentPos = this.pushNextWord(input, currentPos, tokens)
              continue;
            }
          }
        }


      }

      /*
       * Possible closing template tags
       */
      // Check for underscore template: '%>'
      if (char === '%') {
        if (currentPos + 1 < input.length && input[currentPos + 1] === '>') {
          this.pushToken(tokens, {type: 'underscore-end', value: '%>'})
          currentPos += 2;
          continue;
        }
      }
      // Check for frostlining conditional:  '?>'
      else if (char === '?') {
        if (currentPos + 1 < input.length && input[currentPos + 1] === '>') {
          this.pushToken(tokens, {type: 'fl-conditional-end', value: '?>'})
          currentPos += 2;
          continue;
        }
      }
      // Check for frostlining styling:  ':>'
      else if (char === ':') {
        if (currentPos + 1 < input.length && input[currentPos + 1] === '>') {
          this.pushToken(tokens, {type: 'fl-styling-end', value: ':>'})
          currentPos += 2;
          continue;
        }
      }
      // Check for frostlining dialogue end: '>>>'
      if (char === '>' &&
          currentPos + 2 < input.length &&
          input[currentPos + 1] === '>' && input[currentPos + 2] === '>') {

        this.pushToken(tokens, {type: 'fl-dialogue-end', value: '>>>'})
        currentPos += 3;
        continue;
      }

      // No matches found -- just append this to workingText
      this.workingText += char;
      currentPos += 1;
    }

    // Flush working text before returning the tokens.
    if (this.workingText.length > 0) {
      tokens.push({type: 'text', value: this.workingText})
      this.workingText = ''
    }

    return tokens;
  }

  // Pushes the next string of non-whitespace characters as a 'word'. This
  // will (slightly) simplify processing later on (hopefully).
  pushNextWord(input, currentPos, tokens) {
    let nextPos = currentPos;
    let value = ''
    while (nextPos < input.length && !/\s/.test(input[nextPos])) {
        value += input[nextPos];
        nextPos += 1;
    }

    if (value.length > 0) {
      this.pushToken(tokens, {type: 'word', value: value})
    }

    return nextPos;
  }

  pushToken(tokens, token) {
    // flush any working tokens.
    if (this.workingText.length > 0) {
      tokens.push({type: 'text', value: this.workingText})
      this.workingText = ''
    }

    tokens.push(token);
  }
}