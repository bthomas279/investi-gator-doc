/* ==========================================================================
   Investi-gator playground — sample texts

   Prefills for the paste box, so a first-time visitor can see a real
   classification without having to compose 80+ characters of their own.

   Data only, same loading contract as views/updates.js: a plain <script>
   that hangs the array off the global.

   ONE OF THESE SHOULD COME BACK CLEAN
   -----------------------------------
   A demo where every example gets flagged reads as a model that flags
   everything, so the set needs a negative case. An earlier attempt at one
   was written as filler to sound like a normal person, and the AI-text
   detector caught it — correctly, since that is exactly what it is trained
   to do. A convincing negative example cannot be written to order; it has
   to be a real post by a real person, which is what the third entry is.

   It is also the most interesting of the three: it contains a link, which
   is a signal the scam detector weighs, so it tests that a legitimate post
   sharing a URL does not get flagged for having one.

   @type {{ label: string, text: string }[]}
   ========================================================================== */
var PLAYGROUND_SAMPLES = [
  {
    label: "Looks AI-written",
    text:
      "In today's ever-evolving digital landscape, it is important to note that " +
      "social media plays a crucial role in shaping public discourse. Moreover, " +
      "as we navigate the multifaceted realm of online interaction, we must " +
      "delve into the rich tapestry of perspectives that emerge. Furthermore, " +
      "fostering a robust and seamless dialogue is a testament to the strength " +
      "of our shared community.",
  },
  {
    label: "Looks like a scam",
    text:
      "URGENT: You have won our crypto giveaway! Act now, this is a limited " +
      "time investment opportunity and it is 100% risk-free. Click here to " +
      "verify your account before it gets suspended, then DM me your wallet " +
      "address and we will double your deposit. Guaranteed.",
  },
  {
    label: "Ordinary post",
    text:
      "Differential forms and calculus on spheres -- with pictures!\n" +
      "Have you ever wanted to do calculus on the surface of a sphere, or " +
      "other exotic shapes? Have you ever wondered what 'dx' really means?\n\n" +
      "My friend and I wrote a blog post at " +
      "https://hidden-phenomena.com/articles/diff-forms covering the basic " +
      "ideas of doing calculus on exotic shapes, with lots of fun animated " +
      "widgets.",
  },
];
