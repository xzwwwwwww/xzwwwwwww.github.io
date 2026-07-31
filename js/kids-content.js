/* 小朋友专区·栏目示例内容（双语数据）
 * kids.js 按此渲染栏目方框与文章页；加新内容 = 在这里加数据即可
 * arts 每项：{ t: 标题, ps: [段落...], fig?: 内联SVG字符串, html?: 追加的原始HTML }
 */
const KIDS_CONTENT = {
  ui: {
    more: { zh: "—— 更多内容筹备中，敬请期待 ——", en: "—— More on the way ——" }
  },

  explore: {
    science: {
      zh: {
        name: "小小科学家",
        arts: [
          {
            t: "彩虹是怎么形成的？",
            ps: [
              "下过雨的空气里飘着无数小水滴，每一颗都像一颗小小的玻璃珠。阳光钻进水滴时会拐个弯（这叫“折射”），在水滴背面照镜子似的弹回来，再钻出来时又拐一次弯。",
              "阳光看起来是白色的，其实是红、橙、黄、绿、蓝、紫好多颜色抱在一起。它们拐弯的角度不一样，就被水滴“分”开了，排成一座七色拱桥。",
              "想看到彩虹？记住口诀：背对太阳，面向雨幕。下次雨后出太阳时试试看！"
            ],
            fig: "<svg viewBox='0 0 420 150' xmlns='http://www.w3.org/2000/svg'><circle cx='60' cy='42' r='22' fill='#F0C24E' stroke='#4A3226' stroke-width='2.5'/><g stroke='#F0C24E' stroke-width='3' stroke-linecap='round'><line x1='60' y1='8' x2='60' y2='2'/><line x1='60' y1='76' x2='60' y2='82'/><line x1='26' y1='42' x2='20' y2='42'/><line x1='94' y1='42' x2='100' y2='42'/><line x1='36' y1='18' x2='32' y2='14'/><line x1='84' y1='66' x2='88' y2='70'/></g><ellipse cx='210' cy='70' rx='46' ry='20' fill='#FFFDF8' stroke='#4A3226' stroke-width='2.5'/><ellipse cx='186' cy='62' rx='22' ry='14' fill='#FFFDF8' stroke='#4A3226' stroke-width='2.5'/><ellipse cx='234' cy='60' rx='20' ry='13' fill='#FFFDF8' stroke='#4A3226' stroke-width='2.5'/><g stroke='#7AC7E3' stroke-width='2.5' stroke-linecap='round'><line x1='192' y1='86' x2='188' y2='98'/><line x1='210' y1='88' x2='206' y2='100'/><line x1='228' y1='86' x2='224' y2='98'/></g><path d='M 96,50 L 180,66' stroke='#A39E94' stroke-width='2' stroke-dasharray='4 4'/><g fill='none' stroke-width='5'><path d='M 268,130 A 62,62 0 0 1 392,130' stroke='#E86A6A'/><path d='M 278,130 A 52,52 0 0 1 382,130' stroke='#F5A623'/><path d='M 288,130 A 42,42 0 0 1 372,130' stroke='#C6D64F'/><path d='M 298,130 A 32,32 0 0 1 362,130' stroke='#4FA3D1'/></g><path d='M 236,92 L 276,116' stroke='#A39E94' stroke-width='2' stroke-dasharray='4 4'/></svg>"
          },
          {
            t: "为什么天是蓝的？",
            ps: [
              "阳光跑进地球的大气层时，会撞上空气里数不清的 tiny 分子。蓝光波长短、脾气急，一撞就弹得到处都是；红光波长长、性子稳，大多直线冲过去。",
              "于是蓝光被弹得满天都是，从哪个方向看都有蓝光钻进你的眼睛——天空看起来就是蓝色的啦。",
              "傍晚太阳落山时，光要穿过更厚的大气，蓝光半路就弹没了，剩下红光和橙光，所以晚霞是红红的。"
            ]
          }
        ]
      },
      en: {
        name: "Little Scientist",
        arts: [
          {
            t: "How Does a Rainbow Form?",
            ps: [
              "After rain, the air is full of tiny water drops, and each one acts like a little glass bead. When sunlight enters a drop, it bends (that's called \"refraction\"), bounces off the back of the drop like a mirror, and bends again on the way out.",
              "Sunlight looks white, but it's really red, orange, yellow, green, blue and purple all hugged together. Each color bends by a slightly different angle, so the drops split them apart into a seven-color arch.",
              "Want to spot one? Remember the trick: stand with your back to the sun and face the rain. Try it next time the sun comes out after a shower!"
            ],
            fig: "<svg viewBox='0 0 420 150' xmlns='http://www.w3.org/2000/svg'><circle cx='60' cy='42' r='22' fill='#F0C24E' stroke='#4A3226' stroke-width='2.5'/><g stroke='#F0C24E' stroke-width='3' stroke-linecap='round'><line x1='60' y1='8' x2='60' y2='2'/><line x1='60' y1='76' x2='60' y2='82'/><line x1='26' y1='42' x2='20' y2='42'/><line x1='94' y1='42' x2='100' y2='42'/><line x1='36' y1='18' x2='32' y2='14'/><line x1='84' y1='66' x2='88' y2='70'/></g><ellipse cx='210' cy='70' rx='46' ry='20' fill='#FFFDF8' stroke='#4A3226' stroke-width='2.5'/><ellipse cx='186' cy='62' rx='22' ry='14' fill='#FFFDF8' stroke='#4A3226' stroke-width='2.5'/><ellipse cx='234' cy='60' rx='20' ry='13' fill='#FFFDF8' stroke='#4A3226' stroke-width='2.5'/><g stroke='#7AC7E3' stroke-width='2.5' stroke-linecap='round'><line x1='192' y1='86' x2='188' y2='98'/><line x1='210' y1='88' x2='206' y2='100'/><line x1='228' y1='86' x2='224' y2='98'/></g><path d='M 96,50 L 180,66' stroke='#A39E94' stroke-width='2' stroke-dasharray='4 4'/><g fill='none' stroke-width='5'><path d='M 268,130 A 62,62 0 0 1 392,130' stroke='#E86A6A'/><path d='M 278,130 A 52,52 0 0 1 382,130' stroke='#F5A623'/><path d='M 288,130 A 42,42 0 0 1 372,130' stroke='#C6D64F'/><path d='M 298,130 A 32,32 0 0 1 362,130' stroke='#4FA3D1'/></g><path d='M 236,92 L 276,116' stroke='#A39E94' stroke-width='2' stroke-dasharray='4 4'/></svg>"
          },
          {
            t: "Why Is the Sky Blue?",
            ps: [
              "When sunlight rushes into Earth's atmosphere, it bumps into countless tiny air molecules. Blue light has a short wavelength and a jumpy temper — it bounces off in every direction. Red light has a long wavelength and mostly sails straight through.",
              "So blue light gets scattered all over the sky, and no matter where you look, some of it lands in your eyes. That's why the sky looks blue!",
              "At sunset, sunlight travels through much more air. The blue light gets scattered away completely, leaving red and orange — that's why sunsets glow red."
            ]
          }
        ]
      }
    },

    animals: {
      zh: {
        name: "动物世界",
        arts: [
          {
            t: "今日动物：大熊猫",
            ps: [
              "大熊猫看起来憨憨的，其实是个“直肠子”——它们的肠胃更适合消化肉类，却几乎天天啃竹子。竹子营养少，所以大熊猫每天要花十几个小时吃饭，能吃掉十几公斤竹子！",
              "冷知识一：熊猫宝宝出生时只有老鼠那么大，体重约 100 克，是妈妈体重的九百分之一。",
              "冷知识二：大熊猫有六根“手指”！多出来的那根叫“伪拇指”，其实是一块变大的腕骨，专门帮它们握住竹子。",
              "（这里以后每天换一种动物，配上真实照片，记得常来看看～）"
            ]
          }
        ]
      },
      en: {
        name: "Animal World",
        arts: [
          {
            t: "Animal of the Day: Giant Panda",
            ps: [
              "Pandas look cuddly, but here's a secret: their stomachs are built for digesting meat, yet they munch bamboo almost all day. Bamboo has so little nutrition that a panda spends more than ten hours a day eating, finishing over ten kilograms of it!",
              "Fun fact one: a newborn panda cub is about the size of a mouse — only around 100 grams, roughly 1/900 of its mother's weight.",
              "Fun fact two: pandas have six \"fingers\"! The extra one is called a pseudo-thumb. It's actually an enlarged wrist bone that helps them grip bamboo.",
              "(A new animal with a real photo will land here every day — come back often!)"
            ]
          }
        ]
      }
    },

    history: {
      zh: {
        name: "历史小火车",
        arts: [
          {
            t: "假如你和秦始皇一起吃火锅",
            ps: [
              "叮咚，你穿越到了秦朝，秦始皇请你吃火锅！先别急着开心——桌上没有牛油红汤，也没有辣椒。辣椒要到一千八百多年后的明朝才来到中国呢。",
              "秦朝人的“火锅”是一口青铜鼎，架在炭火上咕嘟咕嘟。涮什么呢？小米饭配烤肉，还有豆酱蘸野菜。没有筷子夹菜？那时候筷子主要用来从汤里捞东西，大家吃饭更多用手和勺子。",
              "你夹起一片肉想蘸辣油，秦始皇摇摇头递给你一勺豆豉酱。原来，历史就藏在一餐饭里呀。"
            ]
          }
        ]
      },
      en: {
        name: "History Express",
        arts: [
          {
            t: "What If You Had Hotpot with Emperor Qin?",
            ps: [
              "Ding — you've time-traveled to the Qin dynasty, and Emperor Qin Shi Huang invites you to hotpot! But wait: there's no spicy red broth and no chili peppers at all. Chilies wouldn't reach China for another 1,800 years, in the Ming dynasty.",
              "The Qin \"hotpot\" is a bronze ding cauldron bubbling over charcoal. What's on the menu? Millet rice, roast meat, and wild greens dipped in bean paste. And don't look for chopsticks to pick up food — back then they were mainly ladling tools; most people ate with spoons and fingers.",
              "You reach for chili oil, and the Emperor hands you a spoon of fermented bean sauce instead. See? History hides inside a single meal."
            ]
          }
        ]
      }
    },

    travel: {
      zh: {
        name: "环球旅行家",
        arts: [
          {
            t: "第一站：日本",
            ps: [
              "我们的小飞机降落在日本。春天，满城樱花像粉色的云。日本人喜欢全家在樱花树下铺野餐垫，这叫“花见”（はなみ），意思是“看花”。",
              "尝尝这里的美食：握寿司是师傅用手掌的温度捏出来的；饭团里常常藏着一颗酸梅，咬到的时候酸得眯起眼睛。",
              "每年 5 月 5 日是日本的儿童节，家家户户挂起鲤鱼旗——彩色的鲤鱼在风里游来游去，爸爸妈妈希望孩子像鲤鱼一样勇敢，逆流而上。",
              "（下一站想去哪个国家？互动地图正在路上～）"
            ]
          }
        ]
      },
      en: {
        name: "Global Traveler",
        arts: [
          {
            t: "First Stop: Japan",
            ps: [
              "Our little plane lands in Japan. In spring, cherry blossoms cover the cities like pink clouds. Families picnic under the blooming trees — they call it \"hanami\", which means \"flower viewing\".",
              "Try the food: nigiri sushi is shaped by the warmth of the chef's palms, and rice balls often hide a sour pickled plum inside — one bite and your eyes squint!",
              "May 5th is Children's Day in Japan. Homes fly colorful carp streamers that swim in the wind. Parents wish their kids to be as brave as carp, swimming upstream no matter what.",
              "(Where to next? An interactive map is on its way!)"
            ]
          }
        ]
      }
    }
  },

  craft: {
    diy: {
      zh: {
        name: "DIY工坊",
        arts: [
          {
            t: "折一架能飞很远的纸飞机",
            ps: [
              "准备一张 A4 纸，竖着放。第一步：左右对折，压出中线后打开。第二步：上面两个角向中线折，折出一个尖尖的机头。",
              "第三步：把尖角再向中线折一次，机头变得更尖更长。第四步：沿中线把整张纸对折，尖角朝外。",
              "第五步：两边各向下折出机翼，机翼要和身体一样平。最后捏着机身底部轻轻一扔——飞起来了！想让它转弯？把一边机翼的后缘稍微向上掰一点点就好。"
            ]
          }
        ]
      },
      en: {
        name: "DIY Workshop",
        arts: [
          {
            t: "Fold a Paper Plane That Flies Far",
            ps: [
              "Grab a sheet of A4 paper and place it upright. Step 1: fold it in half lengthwise, crease the center line, then open it up. Step 2: fold the two top corners into the center line to make a pointy nose.",
              "Step 3: fold the new edges into the center again for an even sharper nose. Step 4: fold the whole sheet in half along the center line, with the point facing out.",
              "Step 5: fold down a wing on each side, keeping the wings flat and level. Hold the bottom of the body and give a gentle toss — off it goes! Want it to turn? Bend the back edge of one wing up just a tiny bit."
            ]
          }
        ]
      }
    },

    kitchen: {
      zh: {
        name: "厨房小帮手",
        arts: [
          {
            t: "不用开火的水果拼盘：香蕉小海豚",
            ps: [
              "今天的厨房不开火、不动刀（切水果请爸爸妈妈帮忙），我们来做一盘子会游泳的小海豚！",
              "材料：一根香蕉、几颗蓝莓、一片苹果。做法：香蕉拦腰切成两段，取上半段；在香蕉头上轻轻划开一个小口，塞进一颗蓝莓当作海豚的眼睛（两颗更好）。",
              "把香蕉底部竖着切一小刀，掰开一点点，就是海豚翘起来的尾巴；苹果片切成三角形当背鳍，插在背上。摆进盘子里——一群小海豚正在蓝色的大海里跳水呢！"
            ]
          }
        ]
      },
      en: {
        name: "Kitchen Helper",
        arts: [
          {
            t: "No-Cook Fruit Plate: Banana Dolphins",
            ps: [
              "Today our kitchen stays cold and safe — no stove, and let Mom or Dad do the cutting. We're making a plate of swimming dolphins!",
              "You need: one banana, a few blueberries, and a slice of apple. How: cut the banana in half and take the top piece; gently split the tip and tuck in a blueberry for the dolphin's eye (two is cuter).",
              "Make a small vertical cut at the bottom and open it slightly — that's the tail fin. Cut the apple slice into a triangle for the back fin and place it on top. Arrange on a plate — a pod of little dolphins leaping in a blue sea!"
            ]
          }
        ]
      }
    },

    recycle: {
      zh: {
        name: "变废为宝",
        arts: [
          {
            t: "矿泉水瓶变身小动物笔筒",
            ps: [
              "喝完的矿泉水瓶先别扔！洗干净、撕掉标签，它马上就要变成你书桌上的小动物笔筒。",
              "请大人帮忙把瓶子从中间剪开，保留下半部分。用彩纸剪出两只圆耳朵贴在瓶口两侧，再贴上活动眼珠（或用笔画上笑眯眯的眼睛）。",
              "最后贴上一条弯弯的尾巴，装上你的铅笔、彩笔和橡皮——一只乖乖的小熊笔筒就诞生啦。少一个塑料瓶进垃圾桶，多一个小伙伴陪你写作业，这就是环保的力量。"
            ]
          }
        ]
      },
      en: {
        name: "Trash to Treasure",
        arts: [
          {
            t: "Turn a Plastic Bottle into an Animal Pencil Holder",
            ps: [
              "Don't toss that empty water bottle yet! Wash it and peel off the label — it's about to become an animal pencil holder for your desk.",
              "Ask a grown-up to cut the bottle in half and keep the bottom part. Cut two round ears from colored paper and stick them on the rim, then add googly eyes (or draw on a smiling face).",
              "Glue on a curvy tail, then load it with pencils, markers and erasers — a cheerful little bear is born. One less bottle in the trash, one more buddy on your desk. That's the power of recycling!"
            ]
          }
        ]
      }
    },

    drawing: {
      zh: {
        name: "画画小课堂",
        arts: [
          {
            t: "四步画出一条胖胖的小鱼",
            ps: [
              "第一步：画一个圆滚滚的椭圆，这是小鱼的身体。第二步：在身体后面画一个三角形当尾巴，像给身体装了一个小扇子。",
              "第三步：在身体前面点一个圆圆的眼睛，再画一条弯弯的嘴巴——笑一笑。第四步：背上和肚子下各添一片鱼鳍，身上画几道波浪花纹。",
              "涂上你喜欢的颜色，周围点上几个泡泡，胖小鱼就游起来啦！（在线涂色板马上就来，到时候可以直接在网页里上色～）"
            ]
          }
        ]
      },
      en: {
        name: "Drawing Class",
        arts: [
          {
            t: "Draw a Chubby Little Fish in 4 Steps",
            ps: [
              "Step 1: draw a round, plump oval — that's the fish's body. Step 2: attach a triangle at the back for a tail, like a little fan.",
              "Step 3: dot a round eye near the front and add a curvy smiling mouth. Step 4: give it one fin on top and one below, plus a few wavy stripes on its body.",
              "Color it any way you like and add some bubbles around — off swims your chubby fish! (An online coloring board is coming soon, so you can color right on the page!)"
            ]
          }
        ]
      }
    }
  },

  games: {
    puzzle: {
      zh: {
        name: "益智闯关",
        arts: [
          {
            t: "数学口算接力赛",
            ps: [
              "规则很简单：算出答案，再把答案变成下一题的开头，一题接一题，看你能接多长！比如 3 + 5 = 8，下一题就用 8 开头：8 - 2 = 6，再下一题：6 × 2 = 12……",
              "想挑战正式版？点上方游戏区的「口算小问答」，二年级和三年级两个难度等着你，每组 10 题，比比谁用时短、正确率高。",
              "汉字拼图、英语单词消消乐也在制作中，很快和大家见面。"
            ]
          }
        ]
      },
      en: {
        name: "Brain Quests",
        arts: [
          {
            t: "Mental Math Relay",
            ps: [
              "The rule is simple: solve a problem, then use the answer to start the next one — how long a chain can you build? 3 + 5 = 8, so the next one starts with 8: 8 - 2 = 6, then 6 × 2 = 12…",
              "Ready for the real challenge? Try the \"Mental Math\" games in the play area above — Grade 2 and Grade 3 levels, 10 questions each round. Race the clock and compare your accuracy!",
              "Chinese character puzzles and an English word-matching game are also in the works."
            ]
          }
        ]
      }
    },

    story: {
      zh: {
        name: "故事接龙",
        arts: [
          {
            t: "今天的故事开头",
            ps: [
              "规则：第一个人写一句话开头，下一个人接着写一句，再下一个人再接一句……一个故事就你一句我一句地长出来了。",
              "今天的开头是：「深夜，书包里突然传出一阵轻轻的敲门声。」",
              "换你啦！和家人或朋友轮流往下接，一人一句。接到第五句、第十句时从头读出来，保证笑出声。",
              "（多人在线接龙功能正在路上，到时候可以和全世界的小朋友一起编故事～）"
            ]
          }
        ]
      },
      en: {
        name: "Story Chain",
        arts: [
          {
            t: "Today's Story Starter",
            ps: [
              "The rules: one person writes an opening sentence, the next adds a sentence, then the next… a story grows one sentence at a time.",
              "Today's opening line: \"Late at night, a soft knock came from inside the schoolbag.\"",
              "Your turn! Take turns with family or friends, one sentence each. Read the whole thing out loud at sentence five and ten — giggles guaranteed.",
              "(An online multiplayer version is on its way, so kids everywhere can build stories together!)"
            ]
          }
        ]
      }
    },

    lab: {
      zh: {
        name: "虚拟实验室",
        arts: [
          {
            t: "虚拟实验：火山喷发",
            ps: [
              "真实的火山喷发，是地下的岩浆憋着一股气，找到出口就冲出来。我们可以用小苏打和白醋安全地模拟：小苏打是碱，白醋是酸，它们一见面就产生大量二氧化碳气体，顶着泡沫往外喷。",
              "在家试试（请爸爸妈妈陪同）：小杯子里放两勺小苏打，滴几滴红色素，再慢慢倒进白醋——红色的“岩浆”马上冒泡溢出来！",
              "想先看模拟动画？下面的火山已经按捺不住了。更真实的互动版虚拟实验室正在搭建中。"
            ],
            fig: "<svg viewBox='0 0 420 170' xmlns='http://www.w3.org/2000/svg'><rect width='420' height='170' fill='#FAFAF7'/><g transform='translate(210 0)'><path d='M -70,150 L -30,80 L -12,80 L -5,68 L 5,68 L 12,80 L 30,80 L 70,150 Z' fill='#8A5A2B' stroke='#4A3226' stroke-width='2.5' stroke-linejoin='round'/><path d='M -5,68 L 5,68 L 12,80 L -12,80 Z' fill='#D95550' stroke='#4A3226' stroke-width='2'/><path d='M -12,80 L 12,80 L 20,102 Q 8,108 0,96 Q -8,108 -20,102 Z' fill='#E86A6A' stroke='#4A3226' stroke-width='2'/><g fill='#D95550'><circle cx='-12' cy='60' r='4'><animate attributeName='cy' values='70;36' dur='1.4s' repeatCount='indefinite'/><animate attributeName='opacity' values='1;0' dur='1.4s' repeatCount='indefinite'/></circle><circle cx='8' cy='64' r='5'><animate attributeName='cy' values='74;30' dur='1.7s' begin='0.4s' repeatCount='indefinite'/><animate attributeName='opacity' values='1;0' dur='1.7s' begin='0.4s' repeatCount='indefinite'/></circle><circle cx='20' cy='66' r='3.5'><animate attributeName='cy' values='74;42' dur='1.3s' begin='0.8s' repeatCount='indefinite'/><animate attributeName='opacity' values='1;0' dur='1.3s' begin='0.8s' repeatCount='indefinite'/></circle></g><line x1='-90' y1='150' x2='90' y2='150' stroke='#4A3226' stroke-width='2.5'/></g></svg>"
          }
        ]
      },
      en: {
        name: "Virtual Lab",
        arts: [
          {
            t: "Virtual Experiment: Volcano Eruption",
            ps: [
              "A real volcano erupts when underground magma builds up pressure and finds an exit. We can simulate it safely with baking soda and vinegar: baking soda is a base and vinegar is an acid — together they release lots of carbon dioxide gas, which pushes the foam up and out.",
              "Try it at home (with a grown-up): put two spoons of baking soda in a cup, add a few drops of red food coloring, then slowly pour in vinegar — red \"lava\" bubbles over right away!",
              "Want the animated version first? The volcano below can hardly wait. A fully interactive virtual lab is under construction."
            ],
            fig: "<svg viewBox='0 0 420 170' xmlns='http://www.w3.org/2000/svg'><rect width='420' height='170' fill='#FAFAF7'/><g transform='translate(210 0)'><path d='M -70,150 L -30,80 L -12,80 L -5,68 L 5,68 L 12,80 L 30,80 L 70,150 Z' fill='#8A5A2B' stroke='#4A3226' stroke-width='2.5' stroke-linejoin='round'/><path d='M -5,68 L 5,68 L 12,80 L -12,80 Z' fill='#D95550' stroke='#4A3226' stroke-width='2'/><path d='M -12,80 L 12,80 L 20,102 Q 8,108 0,96 Q -8,108 -20,102 Z' fill='#E86A6A' stroke='#4A3226' stroke-width='2'/><g fill='#D95550'><circle cx='-12' cy='60' r='4'><animate attributeName='cy' values='70;36' dur='1.4s' repeatCount='indefinite'/><animate attributeName='opacity' values='1;0' dur='1.4s' repeatCount='indefinite'/></circle><circle cx='8' cy='64' r='5'><animate attributeName='cy' values='74;30' dur='1.7s' begin='0.4s' repeatCount='indefinite'/><animate attributeName='opacity' values='1;0' dur='1.7s' begin='0.4s' repeatCount='indefinite'/></circle><circle cx='20' cy='66' r='3.5'><animate attributeName='cy' values='74;42' dur='1.3s' begin='0.8s' repeatCount='indefinite'/><animate attributeName='opacity' values='1;0' dur='1.3s' begin='0.8s' repeatCount='indefinite'/></circle></g><line x1='-90' y1='150' x2='90' y2='150' stroke='#4A3226' stroke-width='2.5'/></g></svg>"
          }
        ]
      }
    },

    music: {
      zh: {
        name: "音乐工坊",
        arts: [
          {
            t: "第一课：节奏是音乐的脚印",
            ps: [
              "先不用任何乐器：拍手一下、跺脚一下，交替进行——哒、咚、哒、咚，这就是最基础的二拍子。加快一点，它变成神气十足的进行曲；放慢一点，它像摇篮轻轻晃。",
              "再试试这个节奏型：拍手、拍手、跺脚（哒、哒、咚），连续循环四次。恭喜你，打出了华尔兹的三拍子！",
              "虚拟钢琴和打击垫正在调试中，马上就能在网页上弹出你的第一首曲子。"
            ]
          }
        ]
      },
      en: {
        name: "Music Workshop",
        arts: [
          {
            t: "Lesson 1: Rhythm Is Music's Footprint",
            ps: [
              "No instruments needed: clap once, stomp once, and alternate — clap, stomp, clap, stomp. That's the basic two-beat. Speed it up and it becomes a marching tune; slow it down and it sways like a cradle.",
              "Now try this pattern: clap, clap, stomp — repeat it four times in a loop. Congratulations, you just played a waltz in three-beat!",
              "A virtual piano and drum pads are being tuned — you'll play your first song right on this page very soon."
            ]
          }
        ]
      }
    }
  },

  grow: {
    emotion: {
      zh: {
        name: "情绪小怪兽",
        arts: [
          {
            t: "认识四只情绪小怪兽",
            ps: [
              "每个人心里都住着几只小怪兽。黄色这只是“乐乐”：它一出现，你嘴角上扬，想蹦蹦跳跳。蓝色这只是“忧忧”：它让你想安静待一会儿，哭一场也没关系，眼泪会把难过冲走一点点。",
              "红色这只是“怒怒”：它一上来，拳头握紧、脸发烫。别急着发火，先深呼吸三次，怒怒就会慢慢变小。紫色这只是“怕怕”：真正的危险来了它会提醒你躲开；但如果只是怕黑、怕上台，告诉爸爸妈妈，陪伴会让它安静下来。",
              "情绪没有好坏，它们都是来送信的。认出是哪种情绪来了，你就已经是很棒的情绪小主人啦！"
            ],
            fig: "<svg viewBox='0 0 420 110' xmlns='http://www.w3.org/2000/svg'><g transform='translate(70 45)'><circle r='26' fill='#F0C24E' stroke='#4A3226' stroke-width='2.5'/><circle cx='-9' cy='-6' r='2.5' fill='#4A3226'/><circle cx='9' cy='-6' r='2.5' fill='#4A3226'/><path d='M -10,4 Q 0,14 10,4' fill='none' stroke='#4A3226' stroke-width='2.5' stroke-linecap='round'/><text y='48' font-size='13' text-anchor='middle' fill='#6F6B64' font-family=\"'Noto Serif SC',serif\">喜</text></g><g transform='translate(187 45)'><circle r='26' fill='#7AC7E3' stroke='#4A3226' stroke-width='2.5'/><circle cx='-9' cy='-6' r='2.5' fill='#4A3226'/><circle cx='9' cy='-6' r='2.5' fill='#4A3226'/><path d='M -9,10 Q 0,2 9,10' fill='none' stroke='#4A3226' stroke-width='2.5' stroke-linecap='round'/><path d='M -14,-2 Q -17,4 -14,8' fill='none' stroke='#4FA3D1' stroke-width='2' stroke-linecap='round'/><text y='48' font-size='13' text-anchor='middle' fill='#6F6B64' font-family=\"'Noto Serif SC',serif\">哀</text></g><g transform='translate(304 45)'><circle r='26' fill='#E86A6A' stroke='#4A3226' stroke-width='2.5'/><path d='M -13,-12 L -5,-8 M 13,-12 L 5,-8' stroke='#4A3226' stroke-width='2.5' stroke-linecap='round'/><circle cx='-8' cy='-3' r='2.3' fill='#4A3226'/><circle cx='8' cy='-3' r='2.3' fill='#4A3226'/><path d='M -7,10 L 7,10' stroke='#4A3226' stroke-width='2.5' stroke-linecap='round'/><text y='48' font-size='13' text-anchor='middle' fill='#6F6B64' font-family=\"'Noto Serif SC',serif\">怒</text></g><g transform='translate(380 45)'><circle r='26' fill='#B39DDB' stroke='#4A3226' stroke-width='2.5'/><circle cx='-8' cy='-5' r='3.5' fill='none' stroke='#4A3226' stroke-width='2'/><circle cx='8' cy='-5' r='3.5' fill='none' stroke='#4A3226' stroke-width='2'/><ellipse cy='8' rx='4' ry='5' fill='none' stroke='#4A3226' stroke-width='2'/><text y='48' font-size='13' text-anchor='middle' fill='#6F6B64' font-family=\"'Noto Serif SC',serif\">惧</text></g></svg>"
          }
        ]
      },
      en: {
        name: "Emotion Monsters",
        arts: [
          {
            t: "Meet the Four Emotion Monsters",
            ps: [
              "A few little monsters live in everyone's heart. The yellow one is Happy: when it shows up, your mouth curls up and you want to bounce. The blue one is Sad: it makes you want some quiet time, and crying is okay — tears wash a bit of the sadness away.",
              "The red one is Angry: your fists clench and your face heats up. Don't explode — take three deep breaths first, and Angry shrinks. The purple one is Scared: it warns you of real danger, but if it's just the dark or a stage, tell Mom or Dad — company calms it down.",
              "Emotions aren't good or bad; they're all messengers. Once you can name which one is visiting, you're already a great captain of your feelings!"
            ],
            fig: "<svg viewBox='0 0 420 110' xmlns='http://www.w3.org/2000/svg'><g transform='translate(70 45)'><circle r='26' fill='#F0C24E' stroke='#4A3226' stroke-width='2.5'/><circle cx='-9' cy='-6' r='2.5' fill='#4A3226'/><circle cx='9' cy='-6' r='2.5' fill='#4A3226'/><path d='M -10,4 Q 0,14 10,4' fill='none' stroke='#4A3226' stroke-width='2.5' stroke-linecap='round'/><text y='48' font-size='12' text-anchor='middle' fill='#6F6B64' font-family='Georgia,serif'>Happy</text></g><g transform='translate(187 45)'><circle r='26' fill='#7AC7E3' stroke='#4A3226' stroke-width='2.5'/><circle cx='-9' cy='-6' r='2.5' fill='#4A3226'/><circle cx='9' cy='-6' r='2.5' fill='#4A3226'/><path d='M -9,10 Q 0,2 9,10' fill='none' stroke='#4A3226' stroke-width='2.5' stroke-linecap='round'/><path d='M -14,-2 Q -17,4 -14,8' fill='none' stroke='#4FA3D1' stroke-width='2' stroke-linecap='round'/><text y='48' font-size='12' text-anchor='middle' fill='#6F6B64' font-family='Georgia,serif'>Sad</text></g><g transform='translate(304 45)'><circle r='26' fill='#E86A6A' stroke='#4A3226' stroke-width='2.5'/><path d='M -13,-12 L -5,-8 M 13,-12 L 5,-8' stroke='#4A3226' stroke-width='2.5' stroke-linecap='round'/><circle cx='-8' cy='-3' r='2.3' fill='#4A3226'/><circle cx='8' cy='-3' r='2.3' fill='#4A3226'/><path d='M -7,10 L 7,10' stroke='#4A3226' stroke-width='2.5' stroke-linecap='round'/><text y='48' font-size='12' text-anchor='middle' fill='#6F6B64' font-family='Georgia,serif'>Angry</text></g><g transform='translate(380 45)'><circle r='26' fill='#B39DDB' stroke='#4A3226' stroke-width='2.5'/><circle cx='-8' cy='-5' r='3.5' fill='none' stroke='#4A3226' stroke-width='2'/><circle cx='8' cy='-5' r='3.5' fill='none' stroke='#4A3226' stroke-width='2'/><ellipse cy='8' rx='4' ry='5' fill='none' stroke='#4A3226' stroke-width='2'/><text y='48' font-size='12' text-anchor='middle' fill='#6F6B64' font-family='Georgia,serif'>Scared</text></g></svg>"
          }
        ]
      }
    },

    safety: {
      zh: {
        name: "安全小卫士",
        arts: [
          {
            t: "情景小问答：陌生人给你糖果怎么办？",
            ps: [
              "放学路上，一位笑眯眯的阿姨递给你一根棒棒糖，还说要带你去买更多。怎么办？",
              "正确做法：不拿、不跟走、快离开。记住三句话——“谢谢，我不要。”“我妈妈在等我。”“我要走了。”然后马上走到人多的地方，找保安、店员或警察叔叔，也可以打电话给爸爸妈妈。",
              "再熟记两条：大人遇到真正的困难，应该找别的成年人帮忙，不会找小孩带路；任何让你“保守秘密”的大人，都要第一时间告诉家长。"
            ]
          }
        ]
      },
      en: {
        name: "Safety Guardian",
        arts: [
          {
            t: "Scenario Quiz: A Stranger Offers You Candy",
            ps: [
              "On the way home from school, a smiling stranger offers you a lollipop and says she'll take you to buy more. What should you do?",
              "The right move: don't take it, don't follow, leave quickly. Remember three lines — \"No, thank you.\" \"My mom is waiting for me.\" \"I have to go.\" Then head straight for a crowded place and find a guard, a shop clerk or a police officer, or call your parents.",
              "Two more rules by heart: an adult who truly needs help asks another adult, never a kid for directions; and any grown-up who asks you to \"keep a secret\" should be reported to your parents right away."
            ]
          }
        ]
      }
    },

    habit: {
      zh: {
        name: "习惯养成打卡",
        arts: [
          {
            t: "打卡墙：本周目标",
            ps: [
              "打卡的魔法在于“连续”：同样一件小事，坚持 21 天就会变成习惯，就像给大脑修出一条小路。",
              "挑一件小事开始吧：睡前刷牙 2 分钟、每天阅读 15 分钟、跳绳 100 下，三选一就够。完成后在日历上画一个大勾，周末数一数自己的勾，超有成就感！",
              "本周示范：周一 ✅ 周二 ✅ 周三 ✅ 周四 ✅ 周五 ✅，周末……就看你的啦！",
              "（在线打卡墙正在制作中，到时候点一下就能打卡，还会自动统计连续天数～）"
            ]
          }
        ]
      },
      en: {
        name: "Habit Check-in",
        arts: [
          {
            t: "Check-in Wall: This Week's Goal",
            ps: [
              "The magic of checking in is streaks: do the same small thing for 21 days and it becomes a habit — like paving a little road in your brain.",
              "Pick just one to start: brush your teeth for 2 minutes before bed, read for 15 minutes a day, or do 100 rope jumps. One is enough. Draw a big tick on the calendar each time, and count your ticks on Sunday — so satisfying!",
              "This week so far: Mon ✅ Tue ✅ Wed ✅ Thu ✅ Fri ✅ — the weekend is up to you!",
              "(An online check-in wall is being built — one tap to check in, with automatic streak counting!)"
            ]
          }
        ]
      }
    },

    bedtime: {
      zh: {
        name: "睡前故事馆",
        arts: [
          {
            t: "今晚的故事：月亮邮递员",
            ps: [
              "月亮上住着一位邮递员。每晚等小朋友们睡着，他就骑着银色的月光出发，把白天大家忘记说出口的“谢谢”和“对不起”装进月光信封，送到该收到的人枕边。",
              "今晚他收到一封特别的信，是一个小男孩写给院子里那棵老槐树的：“谢谢你夏天给我乘凉。”邮递员把信轻轻挂在最低的树枝上，树叶沙沙响，好像在说：“不客气。”",
              "送完所有的信，天边开始泛白。邮递员回到月亮上，给自己也写了一封：“今晚辛苦啦。”他把信塞进枕头底下，甜甜地睡着了。",
              "晚安。明天醒来，记得把没说出口的话，亲口说给那个人听哦。",
              "（真人朗读和 AI 配音的有声版正在准备中～）"
            ]
          }
        ]
      },
      en: {
        name: "Bedtime Stories",
        arts: [
          {
            t: "Tonight's Story: The Moon Postman",
            ps: [
              "A postman lives on the moon. Every night, once the children are asleep, he rides a beam of silver moonlight and collects the \"thank yous\" and \"sorries\" that went unsaid during the day, sealing them into moonlight envelopes and delivering them to the right pillows.",
              "Tonight he carries a special letter — from a little boy to the old locust tree in the yard: \"Thank you for your shade in summer.\" The postman hangs it gently on the lowest branch, and the leaves rustle as if saying, \"You're welcome.\"",
              "With every letter delivered, the sky turns pale. Back on the moon, the postman writes one last letter — to himself: \"Good job tonight.\" He tucks it under his pillow and falls sweetly asleep.",
              "Good night. Tomorrow, remember to say the unsaid words out loud, in person.",
              "(A read-aloud version with real and AI narration is being prepared!)"
            ]
          }
        ]
      }
    }
  },

  stage: {
    quiz: {
      zh: {
        name: "问答小博士",
        arts: [
          {
            t: "本周问答",
            ps: [
              "哪种动物每天睡觉时间最长，一天能睡 18-22 个小时？",
              "A. 长颈鹿　　B. 考拉　　C. 狮子"
            ],
            html: "<details class=\"col-art-answer\"><summary>点我查看答案</summary><p>答案：B. 考拉！考拉每天要睡 18 到 22 个小时，清醒的时间大多用来慢慢吃桉树叶。长颈鹿每天只睡大约 2 小时；狮子能睡 15-20 个小时，还是比不过考拉。答对的小朋友，给自己颁发一枚 🏅「小博士徽章」吧！下周新题目见～</p></details>"
          }
        ]
      },
      en: {
        name: "Quiz Master",
        arts: [
          {
            t: "Quiz of the Week",
            ps: [
              "Which animal sleeps the longest each day — a full 18 to 22 hours?",
              "A. Giraffe　　B. Koala　　C. Lion"
            ],
            html: "<details class=\"col-art-answer\"><summary>Tap to reveal the answer</summary><p>Answer: B. Koala! Koalas sleep 18 to 22 hours a day and spend most of their waking hours munching eucalyptus leaves. Giraffes sleep only about 2 hours; lions manage 15-20 hours but still can't beat the koala. If you got it right, award yourself a 🏅 Little Doctor Badge! See you next week with a new question~</p></details>"
          }
        ]
      }
    }
  }
};
