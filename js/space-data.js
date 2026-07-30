/* ============================================
 * 「你和我」数据文件 —— 账号密码和内容都改这里！
 *
 * 每个用户一项：
 *   username: 登录用户名（区分大小写）
 *   password: 登录密码
 *   nickname: 留言时显示的名字（可选，不写就显示用户名）
 *   label:    登录后页面顶部显示的标题
 *   label_en: 英文版标题（可选），英文模式下显示
 *   entries:  这个用户能看到的内容，按日期倒序显示，每项：
 *     date:   日期
 *     title:  条目标题
 *     title_en: 英文版标题（可选）
 *     text:   正文段落数组，每段一个字符串（不需要可写 []）
 *     text_en: 英文版正文（可选），段落数建议和 text 一致
 *     photos: 图片路径数组，如 ["images/us/1.jpg"]（不需要可写 []）
 *
 * *_en 都不写的话，英文模式也显示中文原文。
 *
 * 注意：这是纯前端校验，懂技术的人查看源码可以看到下面的内容，
 * 请勿存放真正敏感的信息。
 * ============================================ */

const SPACE_USERS = [
  {
    username: "szddddddd",
    password: "051224",
    label: "给你的小天地 🌷",
    label_en: "A Little Corner for You 🌷",
    entries: [
      {
        date: "2026-07-22",
        title: "第一封信",
        title_en: "The First Letter",
        text: [
          "这里是只有你能看到的内容。",
          "你好，我的新朋友。"
        ],
        text_en: [
          "This corner is only visible to you.",
          "Hello, my new friend."
        ],
        photos: []
      },
      {
        date: "2026-07-25",
        title: "第二封信",
        title_en: "The Second Letter",
        text: [
          "展信佳：",
          "你好，我的男朋友。",
          "我知道你一直都压力很大，有很大的目标想要实现。",
          "我也知道你其实一直都很努力，想要让自己变得更好。",
          "我想告诉你，你已经很棒了。",
          "你一直都在努力，虽然有时候会觉得自己不够好，但你已经做得很好了。",
          "我希望你能对自己更温柔一些，不要总是苛责自己。",
          "我希望你能记住，你是一个很棒的人，你值得被爱和被珍惜。",
          "我希望你能继续努力，但也要记得照顾好自己。",
          "我会一直在这里支持你，陪伴你。",
          "我喜欢你。"
        ],
        text_en: [
          "Dear you,",
          "Hello, my boyfriend.",
          "I know you've been under a lot of pressure, chasing big goals.",
          "I also know how hard you've been working to become better.",
          "I want you to know: you're already amazing.",
          "You keep pushing yourself. Sometimes you feel not good enough, but you're doing so well.",
          "I hope you'll be gentler with yourself and stop being so hard on yourself.",
          "I hope you remember: you are a wonderful person, worthy of love and being cherished.",
          "I hope you keep going — but please take care of yourself too.",
          "I'll always be here, supporting you and staying by your side.",
          "I love you."
        ],
        photos: []
      },
      {
        date: "2026-07-27",
        title: "谴责信",
        title_en: "Letter of Censure",
        text: [
          "我讨厌你szd。"
        ],
        text_en: [
          "I hate you, szd."
        ],
        photos: []
      },
    ]
  },
  {
    username: "carysssssss",
    password: "031123",
    label: "秘密基地 ⭐",
    label_en: "Secret Base ⭐",
    entries: [
      {
        date: "2026-07-20",
        title: "欢迎",
        title_en: "Welcome",
        text: ["美丽的carys，你好。"],
        text_en: ["This corner is only visible to you."],
        photos: []
      },
      {
        date: "2026-07-27",
        title: "亲爱的蔡蔡女士",
        title_en: "Dear Ms. Carys",
        text: ["最近还好么？",
          "我想你啦。"
        ],
        text_en: ["How have you been lately?",
          "I miss you."
        ],
        photos: []
      }
    ]
  }
];
