(() => {
  "use strict";

  const books = [
    ["Genesis","genesis",50,"OT"],["Exodus","exodus",40,"OT"],["Leviticus","leviticus",27,"OT"],["Numbers","numbers",36,"OT"],["Deuteronomy","deuteronomy",34,"OT"],
    ["Joshua","joshua",24,"OT"],["Judges","judges",21,"OT"],["Ruth","ruth",4,"OT"],["1 Samuel","1samuel",31,"OT"],["2 Samuel","2samuel",24,"OT"],
    ["1 Kings","1kings",22,"OT"],["2 Kings","2kings",25,"OT"],["1 Chronicles","1chronicles",29,"OT"],["2 Chronicles","2chronicles",36,"OT"],["Ezra","ezra",10,"OT"],
    ["Nehemiah","nehemiah",13,"OT"],["Esther","esther",10,"OT"],["Job","job",42,"OT"],["Psalms","psalms",150,"OT"],["Proverbs","proverbs",31,"OT"],
    ["Ecclesiastes","ecclesiastes",12,"OT"],["Song of Solomon","songofsolomon",8,"OT"],["Isaiah","isaiah",66,"OT"],["Jeremiah","jeremiah",52,"OT"],["Lamentations","lamentations",5,"OT"],
    ["Ezekiel","ezekiel",48,"OT"],["Daniel","daniel",12,"OT"],["Hosea","hosea",14,"OT"],["Joel","joel",3,"OT"],["Amos","amos",9,"OT"],
    ["Obadiah","obadiah",1,"OT"],["Jonah","jonah",4,"OT"],["Micah","micah",7,"OT"],["Nahum","nahum",3,"OT"],["Habakkuk","habakkuk",3,"OT"],
    ["Zephaniah","zephaniah",3,"OT"],["Haggai","haggai",2,"OT"],["Zechariah","zechariah",14,"OT"],["Malachi","malachi",4,"OT"],
    ["Matthew","matthew",28,"NT"],["Mark","mark",16,"NT"],["Luke","luke",24,"NT"],["John","john",21,"NT"],["Acts","acts",28,"NT"],
    ["Romans","romans",16,"NT"],["1 Corinthians","1corinthians",16,"NT"],["2 Corinthians","2corinthians",13,"NT"],["Galatians","galatians",6,"NT"],["Ephesians","ephesians",6,"NT"],
    ["Philippians","philippians",4,"NT"],["Colossians","colossians",4,"NT"],["1 Thessalonians","1thessalonians",5,"NT"],["2 Thessalonians","2thessalonians",3,"NT"],["1 Timothy","1timothy",6,"NT"],
    ["2 Timothy","2timothy",4,"NT"],["Titus","titus",3,"NT"],["Philemon","philemon",1,"NT"],["Hebrews","hebrews",13,"NT"],["James","james",5,"NT"],
    ["1 Peter","1peter",5,"NT"],["2 Peter","2peter",3,"NT"],["1 John","1john",5,"NT"],["2 John","2john",1,"NT"],["3 John","3john",1,"NT"],
    ["Jude","jude",1,"NT"],["Revelation","revelation",22,"NT"]
  ].map(function(row){ return { name:row[0], slug:row[1], chapters:row[2], testament:row[3] }; });

  const topics = {
    anxiety:["Philippians 4:6-7","1 Peter 5:7","Psalm 56:3-4","John 14:27"],
    grief:["Psalm 34:18","Psalm 147:3","John 11:35","Revelation 21:4"],
    money:["Matthew 6:31-34","Proverbs 21:5","Philippians 4:19","James 1:5"],
    relationships:["James 1:19-20","Ephesians 4:15","Colossians 3:13","Proverbs 15:1"],
    forgiveness:["1 John 1:9","Psalm 51:10","Romans 8:1","Ephesians 4:32"],
    sleep:["Psalm 4:8","Psalm 23:2","Matthew 11:28","Proverbs 3:24"],
    guidance:["James 1:5","Proverbs 3:5-6","Psalm 119:105","Romans 12:2"],
    health:["Isaiah 41:10","Psalm 41:3","James 5:14-15","Psalm 121:1-2"],
    loneliness:["Psalm 23:4","Isaiah 41:10","Hebrews 13:5","Psalm 68:6"],
    anger:["Ephesians 4:26","James 1:19-20","Proverbs 15:1","Romans 12:19"]
  };

  window.ONEINTOONE_BIBLE_MANIFEST = {
    version:"web-public-domain-v1",
    translation:"World English Bible",
    abbreviation:"WEB",
    license:"Public Domain",
    sourceRepository:"https://github.com/TehShrike/world-english-bible",
    sourceBase:"https://raw.githubusercontent.com/TehShrike/world-english-bible/master/json/",
    books:books,
    topics:topics
  };
})();