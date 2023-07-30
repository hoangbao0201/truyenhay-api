import axios from "axios";
import { load } from "cheerio";
// import * as cheerio from "cheerio";

type Status = "all" | "completed" | "updating";

class ComicsSevices {
    private domain: string;
    constructor() {
        this.domain = "https://www.nettruyen.com";
        // this.domain = "https://metruyencv.com";
    }

    private getComicId(link?: string): string | undefined {
        if (!link) return "";
        return link?.match(/\/([^/]+)-\d+$/)?.[1];
    }

    private getGenreId(link: string): string | undefined {
        if (!link) return "";
        return link?.match(/[^/]+$/)?.[0];
    }
    private trim(text: string): string | undefined {
        return text?.replace(/\n/g, "").trim();
    }

    private async createRequest(path: string): Promise<any> {
        try {
            const { data } = await axios.request({
                method: "GET",
                url: `${this.domain}/${path}`.replace(/\?+/g, "?"),
                headers: {
                    "User-Agent": "*",
                },
                // headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36'}
            });
            return load(data);
        } catch (err) {
            throw err;
        }
    }

    // Get Comics
    private async getComics(
        path: string,
        page: number = 1,
        statusKey: Status = "all"
    ): Promise<any> {
        const keys: any = {
            "Thể loại": "genres",
            "Tình trạng": "status",
            "Lượt xem": "total_views",
            "Bình luận": "total_comments",
            "Theo dõi": "followers",
            "Tên khác": "other_names",
            "Ngày cập nhật": "updated_at",
            "Tác giả": "authors",
        };
        const status: any = {
            all: -1,
            updating: 1,
            completed: 2,
        };
        if (!status[statusKey]) throw Error("Invalid status");
        try {
            const [$, allGenres] = await Promise.all([
                this.createRequest(
                    path.includes("tim-truyen")
                        ? `${path}&status=${status[statusKey]}&page=${page}`
                        : `${
                              path + (path.includes("?") ? "&" : "?")
                          }page=${page}`
                ),
                this.getGenres(),
            ]);
            const total_pages =
                $('a[title="Trang cuối"]')?.attr("href")?.split("=").at(-1) ||
                $(".pagination-outter li.active a").text() ||
                1;
            if (page > Number(total_pages)) {
                return { status: 404, message: "Page not found" };
            }
            const comics = Array.from($("#ctl00_divCenter .item")).map(
                (item) => {
                    const thumbnail =
                        "https:" + $(".image img", item).attr("data-original");
                    const title = this.trim($("figcaption h3", item).text());
                    const id = this.getComicId($("a", item).attr("href"));
                    const is_trending = !!$(".icon-hot", item).toString();
                    const short_description = $(".box_text", item)
                        .text()
                        .replace(/-/g, "")
                        .replace(/\n/g, " ");
                    const cols = Array.from($(".message_main p", item)).map(
                        (col) => {
                            const [_, label, detail]: any = this.trim(
                                $(col).text()
                            )?.match(/^(.*?):(.*)$/);
                            const value = /, |;\s*| - /.test(detail)
                                ? detail.split(/, |;\s*| - /)
                                : detail;
                            const key = keys[label];
                            if (key === "genres") {
                                const genresList = Array.isArray(value)
                                    ? value
                                    : [value];
                                const genres = genresList.map(
                                    (genre: string) => {
                                        const foundGenre = allGenres.find(
                                            (g: any) => g.name === genre
                                        );
                                        return {
                                            id: foundGenre?.id,
                                            name: foundGenre?.name,
                                        };
                                    }
                                );
                                return { genres };
                            }
                            if (key === "status") {
                                return {
                                    status:
                                        value === "Hoàn thành"
                                            ? "Completed"
                                            : "Updating",
                                };
                            }
                            return {
                                [key]: value,
                            };
                        }
                    );
                    const lastest_chapters = Array.from(
                        $(".comic-item li", item)
                    ).map((chap) => {
                        const id = Number($("a", chap).attr("data-id"));
                        const name = $("a", chap).text();
                        const updated_at = $(".time", chap).text();
                        return {
                            id,
                            name,
                            updated_at,
                        };
                    });
                    return Object.assign(
                        {},
                        {
                            thumbnail,
                            title,
                            id,
                            is_trending,
                            short_description,
                            lastest_chapters,
                            genres: [],
                            other_names: [],
                            status: "Updating",
                            total_views: "Updating",
                            total_comments: "Updating",
                            followers: "Updating",
                            updated_at: "Updating",
                            authors: "Updating",
                        },
                        ...cols
                    );
                }
            );
            return {
                comics,
                total_pages: Number(total_pages),
                current_page: page,
            };
        } catch (err) {
            throw err;
        }
    }

    // Get Comics New
    public async getComicsNew(
        status: Status = "all",
        page: number = 1
    ): Promise<any> {
        try {
            // const $ = await this.createRequest("");
            // return $('.text-secondary.fz-14.text-overflow-2-lines').text()

            return await this.getComics("tim-truyen?sort=15", page, status);
        } catch (err) {
            throw err;
        }
    }

    // Get Genres
    public async getGenres(): Promise<any> {
        try {
            const $ = await this.createRequest("");
            const genres = Array.from($("#mainNav .clearfix li a")).map(
                (item) => {
                    const id = this.getGenreId($(item).attr("href"));
                    const name = this.trim($(item).text());
                    const description = $(item).attr("data-title");
                    return {
                        id: id === "tim-truyen" ? "all" : id,
                        name,
                        description,
                    };
                }
            );
            return [
                ...genres,
                {
                    id: "16",
                    name: "16+",
                    description:
                        "Là thể loại có nhiều cảnh nóng, đề cập đến các vấn đề nhạy cảm giới tính hay các cảnh bạo lực máu me .... Nói chung là truyện có tác động xấu đến tâm sinh lý của những độc giả chưa đủ 16 tuổi",
                },
            ];
        } catch (err) {
            throw err;
        }
    }
}

const comicsServices = new ComicsSevices();

export { comicsServices };
