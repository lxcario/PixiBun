extends SceneTree

func _initialize():
    call_deferred("verify")

func verify():
    var scene = load("res://preview.tscn").instantiate()
    root.add_child(scene)
    var data = JSON.parse_string(FileAccess.get_file_as_string("res://manifest.json"))
    var failures: Array[String] = []
    var count := 0
    for clip in data.animation.clips:
        for i in scene.player.sprite_frames.get_frame_count(clip.name):
            var atlas = scene.player.sprite_frames.get_frame_texture(clip.name, i)
            if not atlas is AtlasTexture or not atlas.atlas is CanvasTexture:
                failures.append("Missing atlas/CanvasTexture normal pair")
            elif atlas.atlas.normal_texture == null or atlas.atlas.diffuse_texture == null:
                failures.append("Missing normal or diffuse texture")
            else:
                count += 1
            if scene.player.sprite_frames.get_frame_duration(clip.name, i) != data.animation.frames[clip.frames[i]].durationMs:
                failures.append("Incorrect frame hold")
    var normals = Image.load_from_file("res://normal.png")
    var diffuse = Image.load_from_file("res://atlas.png")
    var expected_colors = [Color8(255, 0, 0), Color8(0, 0, 255), Color8(0, 255, 0)]
    for i in data.rects.size():
        var rect = data.rects[i]
        for y in data.height:
            for x in data.width:
                var n = Color8(128, 240, 190) if i == 1 and x < 16 else Color8(128, 15, 190) if i == 1 else Color8(240, 128, 190) if x < 16 else Color8(15, 128, 190)
                if normals.get_pixel(rect.x + x, rect.y + y) != n:
                    failures.append("Normal channel mismatch")
                if diffuse.get_pixel(rect.x + x, rect.y + y) != expected_colors[i]:
                    failures.append("Diffuse contaminated by visible normal layer")
    if not data.normals or scene.runtime_light == null:
        failures.append("Missing normal runtime configuration")
    print(JSON.stringify({"runtime":"Godot 4.7.2 headless", "normal_pairs":count, "native_frame_pixels":data.width * data.height * data.rects.size(), "failures":failures, "scope":"Resource wiring, frame holds and native PNG channels; no rendered-lighting verdict"}))
    quit(0 if failures.is_empty() else 1)
