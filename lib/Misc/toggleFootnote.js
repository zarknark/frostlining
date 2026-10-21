function toggleFootnote (event) {
  let footnoteID = event.target.id;
  let footnote = document.querySelector(`span#${footnoteID}-footnote`);

  if (footnote.classList.contains(`fl-hidden`)) {
    footnote.classList.remove("fl-hidden");
  } else {
    footnote.classList.add("fl-hidden");
  }
}

export default toggleFootnote;