function toggleFootnote (event) {
  let footnoteID = event.target.id;

  let footnote = document.querySelector(`span.#${footnoteID}-footnote`);

  if (footnote.classlist.contains(`fl-hidden`)) {
    footnote.classlist.remove("fl-hidden");
  } else {
    footnote.classlist.add("fl-hidden");
  }
}

export default toggleFootnote;