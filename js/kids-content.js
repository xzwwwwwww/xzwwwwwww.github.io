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

  // games / grow / stage 三个分类的栏目数据稍后追加到这里
};
