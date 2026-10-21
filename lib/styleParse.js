export default class styleParse {
 static parse(text) {
   // Throw error if input is not a string
   if (typeof text !== 'string') {
     throw new TypeError('Input must be a string');
   }

   return text;
 }
}