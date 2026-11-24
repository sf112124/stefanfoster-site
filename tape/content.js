// What's in the room. Edit this file to add, remove or reorder work — the scene builds itself from it.
//
// TAPES are films: each one is a VHS tape in the stack, played in the TV. A tape can hold one film or a playlist.
// FILES are everything that isn't a film to sit and watch (picture projects, the case study, the toys):
// they live on the computer and open the existing pages of the site.
//
// All paths are relative to the site root. `cover` is the art used on the tape's sleeve; `spine` is its spine colour.

const M = "../media/";

export const TAPES = [
  { id: "avatar", title: "Avatar", client: "Personal", year: 2026, spine: "#c8ff3c",
    clips: [{ src: M + "ai-experiments/09.mp4", title: "Avatar" }],
    cover: M + "ai-experiments/av-05.webp", page: "/#avatar" },
  { id: "tough-love", title: "Tough Love", client: "Personal", year: 2026, spine: "#ff9ec4",
    clips: [{ src: M + "ai-experiments/08c.mp4", title: "Tough Love" }],
    cover: M + "ai-experiments/08c-p.webp", page: "/#ai-experiments" },
  { id: "anywhere", title: "Anywhere", client: "Personal", year: 2026, spine: "#5fa8ff",
    clips: [{ src: M + "ai-experiments/07.mp4", title: "Anywhere" }],
    cover: M + "ai-experiments/07-p.webp", page: "/#ai-experiments" },
  { id: "grow", title: "Grow", client: "Personal", year: 2026, spine: "#ffd23c",
    clips: [{ src: M + "ai-experiments/06.mp4", title: "Grow" }],
    cover: M + "ai-experiments/06t-hd.webp", page: "/#ai-experiments" },
  { id: "jacquemus", title: "Jacquemus", client: "Jacquemus", year: 2025, spine: "#f2ede4",
    clips: [
      { src: M + "ai-commissions/04.mp4", title: "Ibiza, we are here" },
      { src: M + "ai-commissions/03.mp4", title: "The process of making « Plage » Popsicles" },
      { src: M + "ai-commissions/06.mp4", title: "On our way to « Plage »" },
      { src: M + "ai-commissions/01.mp4", title: "Guys, St Tropez never stops surprising me" },
      { src: M + "ai-commissions/07.mp4", title: "Just another day at the Jacquemus LA boutique" },
      { src: M + "ai-commissions/05.mp4", title: "On my way to « Le Bonheur »" },
      { src: M + "ai-commissions/02.mp4", title: "On my way to the Le Paysan show" },
    ], cover: M + "ai-commissions/03-hd.webp", page: "/#ai-experiments" },
  { id: "la-croisiere", title: "La Croisière", client: "Jacquemus × Apple", year: 2025, spine: "#e8d9b8",
    clips: [
      { src: M + "la-croisiere/03.mp4", title: "Just a normal day at Jacquemus" },
      { src: M + "la-croisiere/04.mp4", title: "Dolling around" },
      { src: M + "la-croisiere/01.mp4", title: "Shhhh" },
      { src: M + "la-croisiere/02.mp4", title: "Just a normal day at the atelier" },
    ], cover: M + "la-croisiere/03-hd.webp", page: "/#la-croisiere" },
  { id: "relax", title: "#Relax", client: "Apple", year: 2025, spine: "#9fd8ff",
    clips: [
      { src: M + "relax/01.mp4", title: "AirPods Camera Remote" },
      { src: M + "relax/02.mp4", title: "Dual Capture" },
      { src: M + "relax/03b.mp4", title: "What I hear when an iPhone tumbles" },
    ], cover: M + "relax/01-hd.webp", page: "/#relax" },
  { id: "zombie-cowboys", title: "Zombie Cowboys", client: "Personal", year: 2025, spine: "#7a2b1f",
    clips: [{ src: M + "ai-experiments/04.mp4", title: "Zombie Cowboys" }],
    cover: M + "ai-experiments/04-p.webp", page: "/#ai-experiments" },
  { id: "samurai-barber", title: "Samurai Barber", client: "Personal", year: 2025, spine: "#3cff9a",
    clips: [{ src: M + "ai-experiments/03.mp4", title: "Samurai Barber" }],
    cover: M + "ai-experiments/03-p.webp", page: "/#ai-experiments" },
  { id: "samurai-bounty-hunter", title: "Samurai Bounty Hunter", client: "Personal", year: 2025, spine: "#b31b1b",
    clips: [{ src: M + "ai-experiments/05.mp4", title: "Samurai Bounty Hunter" }],
    cover: M + "ai-experiments/05-hd.webp", page: "/#ai-experiments" },
  { id: "goat", title: "100 Million Goat", client: "Personal", year: 2023, spine: "#ffffff",
    clips: [{ src: M + "ai-experiments/01.mp4", title: "All that for a snack?" }],
    cover: M + "ai-experiments/01-hd.webp", page: "/#ai-experiments" },
];

export const FILES = [
  { id: "from-earth-to-sky", title: "From Earth to Sky", client: "Les Benjamins × Apple", kind: "Case study", href: "/benjamins" },
  { id: "summer-of-sport", title: "Summer of Sport", client: "Apple", kind: "Images", href: "/#summer-of-sport" },
  { id: "3d-explorations", title: "3D Explorations", client: "Personal", kind: "Images", href: "/#3d-explorations" },
  { id: "coca-cola", title: "Coca-Cola", client: "Coca-Cola", kind: "Film", href: "/#coca-cola" },
  { id: "gumtree", title: "Gumtree", client: "Gumtree", kind: "Films", href: "/#gumtree" },
  { id: "pokefolio", title: "Poké-folio", client: "Personal", kind: "Toy", href: "/rpg" },
  { id: "synthfolio", title: "Synth-folio", client: "Personal", kind: "Toy", href: "/synth" },
  { id: "tilt", title: "Tilt", client: "Personal", kind: "Toy · phone", href: "/tilt" },
  { id: "about", title: "About", client: "Stefan Foster", kind: "Contact", href: "/#about" },
];
