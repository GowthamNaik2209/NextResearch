# How you can build a product alone with the help of AI tools

*What I've learned in five weeks of building [NextResearch](https://nextresearchapp.in)*

How can you build a product alone with the help of AI tools? Not long ago the honest answer was "you mostly can't, unless you code". Today you can get surprisingly far on your own. The AI writes the code. Your job is to decide what to build, check what it makes, and test it properly.

I've spent the last five weeks building [NextResearch](https://nextresearchapp.in), a research site for Indian listed companies, this way. This isn't a framework. It's the workflow that has worked for me so far, written down so it's useful to someone else starting out.

The short version: try the idea as a rough prototype first, set up hosting once, keep a test copy separate from the live site, ask for a mock-up before building anything big, and get the work tested on different devices before anyone else sees it. Most of the rest is learning how to talk to the AI.

## Start with a rough prototype in a chat

Before there was any real product, there was one web page. I described the idea in an ordinary AI chat and it made me a rough, clickable version. No login, no database. Just something I could open and react to.

I went back and forth on that page until I was clear about what I wanted. Only then did I move to an AI coding tool, the kind that works inside a real project on your computer. I gave it the prototype and a longer written brief, and my first request wasn't "build this". It was:

```
Go through this brief and tell me what portion of it is already built.
```

It told me what existed, what was missing and what order to build things in. Asking it to check before it builds is a habit I've kept for anything big.

## Set up hosting once

Putting the product on the internet took a full day, and very little of that day was about the product itself.

You need three things, and all three have free plans that go a long way:

- **GitHub** stores your code and keeps a history of every change.
- **Vercel** puts your site online. Every time the code changes, it rebuilds the site automatically.
- **Supabase** gives you a database and handles sign-up and login.

The first day, things will go wrong. For me, login sent people to the wrong address, the live site tried to reach a database on my laptop, and then the database turned out to be empty. Every time, I pasted the exact error message back to the AI and it fixed it. The single most useful message that day was:

```
Be step by step and clear. Open these sites, understand the flow,
then tell me exactly what to do.
```

Give it a day. It's the hardest day, and it doesn't come back.

## Keep a test copy and a live copy

A week in, I set up the one thing I'd do on day one next time: two copies of the site.

- The **live** copy is what the public sees.
- The **test** copy (people call it "staging") has its own web address. Only I use it.

Every change goes to the test copy first. I check it, send back screenshots of anything that's wrong, and only when I'm happy do I say "ship it". The AI then moves the change to the live site and confirms it went through.

Vercel also keeps every older version of your site. If a release goes wrong, you can put the previous one back in a minute. Find that button before you need it.

One warning: if your test and live copies share a database, a change made while testing can touch real users' data. Make it a rule that the AI asks you first and tells you exactly what will change.

## Decide what to build away from the AI

This part doesn't happen in the AI at all, and I think it matters most.

The AI builds fast, which makes it easy to build the wrong thing fast. So I kept a running list of ideas in a notes app and let them sit for a while before turning them into requests. Plenty never made it off the list.

The best features came from talking to users. When several people ask for the same thing in different words, that's your next feature. When a feature ships, listen for the next question it creates. And when someone says "it shows me this, but not that", write it down.

For the look and feel, I used to save Instagram posts whenever a chart or an app screen caught my eye. When it was time to design something, I'd attach a few of them along with screenshots of apps I liked. "Make it like this, in our colours" is a much better brief than anything I could describe in words.

## Talking to the AI

There's no single right way to write a prompt. Mine range from one word to several pages, and what works depends on the moment.

**Detailed, when it will work on its own for a while.** For the first version, or a big new section, I wrote a lot: what it is, who it's for, what each part should do, what not to touch. When the AI is going to make a hundred small decisions without you, detail helps.

**Short, once it knows the rules.** Most of my messages now look like this:

```
Test it, then put it on the test site.
```

```
Status?
```

```
Ship it.
```

That only works because the rules are written down somewhere it reads every time (more on that below). On a brand-new project, a one-line request leaves too much to guesswork.

**A screenshot and a sentence, for anything you can see.** Circle the problem and say what you expected:

```
The gap is too big on phones, where space is already tight. Fix that.
```

You don't need technical words. Describe what a person does:

```
On a phone, people try to pinch to zoom from the middle of the screen.
```

And when you spot one problem, ask it to look for others like it:

```
The chart jumps when the mouse moves over it. Fix that, then check
the rest of the site for the same kind of problem.
```

**Half-formed, when you don't know yet.** This one surprised me. Plenty of my ideas started as a vague feeling, and I just said so:

```
I'm thinking about adding something like this. What do you think?
Think it through for me first.
```

The AI comes back with options and trade-offs, and the idea gets clearer as you react to them. A good part of my site's layout came from conversations like this, where I picked the suggestions I liked and changed the rest.

The catch is that you have to stay the editor. Not every suggestion is good. Push back when something feels wrong, and ask it to explain itself:

```
I expected this to work differently. Explain your reasoning.
```

## Ask for a mock-up first

For anything bigger than a small fix, ask the AI to make a quick mock-up first: a rough version of the screen, in your real colours. Look at it, say "move this here, make that shorter", and only then let it build the real thing.

A mock-up takes ten minutes. Undoing the wrong build can take a day. And it's much easier to point at a picture than to describe a layout in words.

## Test on every kind of device

Whoever built something is the worst person to test it. That goes for the AI and for you, because you both know how it's supposed to work.

So before any change reaches the test site, I have a second, separate AI session go through it as a stranger would. It checks phones of different sizes, tablets and laptop screens, in light and dark mode, and reports only what it sees. It isn't told what might be wrong. The first session fixes what it finds.

Once, I asked for the most thorough version of this, every page on every screen size, then a second pass to recheck each fix, with one line:

```
I don't want anything missed.
```

It found about fifty problems: buttons too small to tap, names spilling onto three lines on small phones, a menu you could only close with the button that opened it.

After that, check it yourself on real devices too: different phones, a tablet, a laptop, and more than one browser. Automated checks catch what's broken. Using it with your own hands catches what's annoying.

## Use more than one AI helper at a time

For bigger jobs you can run several AI sessions side by side, for example one building a new section while another researches the next. It works well if you split the work clearly first: agree on the shared parts up front, and give each session its own files to work on so they don't overwrite each other.

## Teach it things once

Early on I kept repeating myself. The fix is to make the AI write down the rules where it will read them next time. Most AI coding tools have a place for this, a notes or instructions file they read at the start of every session.

I keep three kinds of notes there: preferences (how things should look, words we don't use, how releases work), a short explanation of how the project fits together, and step-by-step recipes for jobs that keep coming back.

A simple rule: if you correct the same thing twice, have it written down. If a task comes up a third time, ask for a recipe.

## Keep an eye on data and costs

Two less exciting things that are worth getting right early.

Keep each piece of data in one place. Otherwise the same number ends up looking different on two pages.

Check your free-plan usage every week. Free plans are generous until they aren't. When something gets expensive, have the AI make it lighter. If a feature needs a paid service you're not ready for, put it on hold instead of shipping it half-done.

## If you're starting this week

Start with a rough prototype in a chat and stay there until you're sure. Give the setup a full day. Make a test copy of your site before you need one. Keep your ideas outside the AI, and talk to users more than you prompt. Ask for a mock-up before anything big. Get every change tested on different devices, by something other than whatever built it. And write down whatever you find yourself repeating.

That's where I am after five weeks. It's still early, and I'm sure some of this will change. You can see the result at [nextresearchapp.in](https://nextresearchapp.in). If you're building something on your own like this, I'd like to hear how it's going.

---

*There's also an [interactive version](https://claude.ai/artifact/PxiTS17PLFKdGA2MCJnuwm) you can click through.*
